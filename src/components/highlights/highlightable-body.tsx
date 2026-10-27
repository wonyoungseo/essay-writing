"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { buildAnchor, mergeRanges, resolveAnchor, trimRange } from "@/features/highlights/anchor";
import { createHighlightAction, deleteHighlightAction } from "@/features/highlights/actions";
import type { HighlightView } from "@/features/highlights/service";

/**
 * 본문 렌더링 + 문장 하이라이트.
 *
 * - 본문 HTML 은 서버에서 sanitize 된 결과이며, React 는 이 컨테이너의 자식을 다시 그리지 않는다.
 * - 저장된 하이라이트는 CSS Custom Highlight API(::highlight)로 칠하므로 DOM 을 직접 수정하지 않는다.
 * - 오프셋은 컨테이너 textContent 기준이며, 서버의 posts.content_text 와 같은 규칙으로 계산된다.
 */

interface Props {
  postId: string;
  html: string;
  /** 서버가 계산한 본문 textContent (posts.content_text) */
  contentText: string;
  initialHighlights: HighlightView[];
  /** 로그인 + 참여 가능한 글이면 true */
  canHighlight: boolean;
  loginHref: string;
}

type Floating =
  | { kind: "selection"; start: number; end: number; top: number; left: number }
  | { kind: "existing"; id: string; top: number; left: number };

function textOffset(container: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(container, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

function offsetsToRange(container: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let acc = 0;
  let startSet = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = (node as Text).data.length;
    if (!startSet && start < acc + len) {
      range.setStart(node, start - acc);
      startSet = true;
    }
    if (startSet && end <= acc + len) {
      range.setEnd(node, end - acc);
      return range;
    }
    acc += len;
  }
  return null;
}

const noopSubscribe = () => () => {};
const supportsHighlights = () => typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

export function HighlightableBody({ postId, html, contentText: fullText, initialHighlights, canHighlight, loginHref }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [floating, setFloating] = useState<Floating | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const supported = useSyncExternalStore(noopSubscribe, supportsHighlights, () => true);

  // 본문 HTML 이 바뀌지 않는 한 React 가 컨테이너를 다시 그리지 않도록 고정한다.
  const bodyMarkup = useMemo(() => ({ __html: html }), [html]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && contentRef.current && contentRef.current.textContent !== fullText) {
      console.warn("[highlight] DOM textContent 와 content_text 가 다릅니다. 오프셋이 어긋날 수 있습니다.");
    }
  }, [fullText]);

  const resolved = useMemo(
    () => highlights.map((h) => ({ highlight: h, range: resolveAnchor(fullText, h) })),
    [highlights, fullText],
  );

  // 저장된 하이라이트 칠하기
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !supportsHighlights()) return;
    const merged = mergeRanges(resolved.flatMap((r) => (r.range ? [r.range] : [])));
    const ranges = merged.map((r) => offsetsToRange(container, r.start, r.end)).filter((r): r is Range => !!r);
    CSS.highlights.set("saved-highlight", new Highlight(...ranges));
    return () => {
      CSS.highlights.delete("saved-highlight");
    };
  }, [resolved]);

  const positionFor = useCallback((rect: DOMRect) => {
    const wrapper = wrapperRef.current!.getBoundingClientRect();
    const left = Math.min(Math.max(rect.left - wrapper.left + rect.width / 2, 90), wrapper.width - 90);
    return { top: rect.bottom - wrapper.top + 10, left };
  }, []);

  // 텍스트 선택 감지 (마우스, 터치, 키보드 선택 모두 selectionchange 로 들어온다)
  useEffect(() => {
    let frame = 0;
    const onSelectionChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const container = contentRef.current;
        const sel = window.getSelection();
        if (!container || !sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
          setFloating((f) => (f?.kind === "selection" ? null : f));
          return;
        }
        const text = container.textContent ?? "";
        if (range.collapsed) {
          // 클릭한 위치가 저장된 하이라이트 안이면 해제 메뉴를 띄운다.
          const offset = textOffset(container, range.startContainer, range.startOffset);
          const hit = resolved.find((r) => r.range && r.range.start <= offset && offset < r.range.end);
          if (hit) {
            const domRange = offsetsToRange(container, hit.range!.start, hit.range!.end);
            if (domRange) setFloating({ kind: "existing", id: hit.highlight.id, ...positionFor(domRange.getBoundingClientRect()) });
          } else {
            setFloating((f) => (f?.kind === "selection" || f?.kind === "existing" ? null : f));
          }
          return;
        }
        const start = textOffset(container, range.startContainer, range.startOffset);
        const end = textOffset(container, range.endContainer, range.endOffset);
        const trimmed = trimRange(text, start, end);
        if (!trimmed) return;
        setFloating({ kind: "selection", ...trimmed, ...positionFor(range.getBoundingClientRect()) });
      });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [resolved, positionFor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFloating(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function save(start: number, end: number) {
    const text = contentRef.current?.textContent ?? "";
    const anchor = buildAnchor(text, start, end);
    if (anchor.selectedText.length > 1000) {
      setMessage({ tone: "error", text: "한 번에 1,000자까지 저장할 수 있습니다. 조금 더 짧게 선택해 주세요." });
      return;
    }
    startTransition(async () => {
      const res = await createHighlightAction({ postId, ...anchor });
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error });
        return;
      }
      window.getSelection()?.removeAllRanges();
      setFloating(null);
      if (res.data.duplicate) {
        setMessage({ tone: "ok", text: "이미 저장한 문장입니다." });
        return;
      }
      setHighlights((prev) => [...prev, res.data.highlight].sort((a, b) => a.startOffset - b.startOffset));
      setMessage({ tone: "ok", text: "문장을 저장했습니다. 내 하이라이트에서 다시 볼 수 있어요." });
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteHighlightAction(id);
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error });
        return;
      }
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      setFloating(null);
      setMessage({ tone: "ok", text: "하이라이트를 해제했습니다." });
    });
  }

  function reveal(id: string) {
    const container = contentRef.current;
    const target = resolved.find((r) => r.highlight.id === id)?.range;
    if (!container || !target) return;
    const domRange = offsetsToRange(container, target.start, target.end);
    if (!domRange) return;
    domRange.startContainer.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (supportsHighlights()) {
      CSS.highlights.set("focus-highlight", new Highlight(domRange));
      window.setTimeout(() => CSS.highlights.delete("focus-highlight"), 1800);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div ref={contentRef} className="essay-body" data-testid="essay-body" dangerouslySetInnerHTML={bodyMarkup} />

      {floating && (
        <div
          role="toolbar"
          aria-label="하이라이트 도구"
          className="absolute z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-ink p-1 text-sm text-paper shadow-lg"
          style={{ top: floating.top, left: floating.left }}
          // 버튼을 눌러도 본문 선택이 풀리지 않도록 한다.
          onMouseDown={(e) => e.preventDefault()}
        >
          {floating.kind === "selection" ? (
            canHighlight ? (
              <button
                type="button"
                className="rounded-full px-4 py-1.5 font-medium hover:bg-ink-soft disabled:opacity-60"
                disabled={pending}
                onClick={() => save(floating.start, floating.end)}
              >
                {pending ? "저장 중…" : "✎ 선택한 문장 저장"}
              </button>
            ) : (
              <Link href={loginHref} className="rounded-full px-4 py-1.5 font-medium hover:bg-ink-soft">
                로그인하고 문장 저장하기
              </Link>
            )
          ) : (
            <button
              type="button"
              className="rounded-full px-4 py-1.5 font-medium hover:bg-ink-soft disabled:opacity-60"
              disabled={pending}
              onClick={() => remove(floating.id)}
            >
              하이라이트 해제
            </button>
          )}
          <button type="button" aria-label="닫기" className="rounded-full px-2.5 py-1.5 hover:bg-ink-soft" onClick={() => setFloating(null)}>
            ✕
          </button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {message?.text}
      </p>
      {message && (
        <div
          className={`fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-lg px-4 py-3 text-sm shadow-lg sm:inset-x-auto sm:right-6 ${
            message.tone === "error" ? "bg-danger text-paper" : "bg-ink text-paper"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            {/* 스크린 리더에는 위의 aria-live 영역으로 한 번만 읽힌다 */}
            <span aria-hidden data-testid="highlight-toast">
              {message.tone === "error" ? "⚠ " : "✓ "}
              {message.text}
            </span>
            <button type="button" aria-label="알림 닫기" onClick={() => setMessage(null)} className="opacity-80 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      )}

      {canHighlight && (
        <aside aria-labelledby="my-highlights-heading" className="mt-14 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 id="my-highlights-heading" className="text-sm font-semibold text-ink">
            이 글에서 저장한 문장 <span className="text-muted">{highlights.length}</span>
          </h2>
          {!supported && (
            <p className="mt-2 text-xs text-muted">이 브라우저는 본문 위 하이라이트 표시를 지원하지 않습니다. 저장한 문장은 아래 목록에서 확인할 수 있어요.</p>
          )}
          {highlights.length === 0 ? (
            <p className="mt-2 text-sm text-muted">본문에서 마음에 드는 문장을 드래그해 선택하면 저장할 수 있어요.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {resolved.map(({ highlight, range }) => (
                <li key={highlight.id} className="flex items-start gap-3 py-3">
                  <blockquote className="min-w-0 flex-1 border-l-2 border-mark pl-3 font-serif text-[15px] leading-relaxed text-ink-soft">
                    {highlight.selectedText}
                    {!range && (
                      <span className="mt-1 block font-sans text-xs text-danger">
                        <span aria-hidden>⚠ </span>본문이 수정되어 위치를 찾을 수 없습니다.
                      </span>
                    )}
                  </blockquote>
                  <div className="flex shrink-0 gap-1">
                    {range && (
                      <button type="button" className="rounded-full px-2.5 py-1 text-xs text-ink-soft hover:bg-paper-deep" onClick={() => reveal(highlight.id)}>
                        위치 보기
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-full px-2.5 py-1 text-xs text-danger hover:bg-danger-soft"
                      disabled={pending}
                      onClick={() => remove(highlight.id)}
                      aria-label={`하이라이트 삭제: ${highlight.selectedText.slice(0, 30)}`}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
