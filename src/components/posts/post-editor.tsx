"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type DragEvent, type KeyboardEvent } from "react";
import { createPostAction, previewMarkdownAction, updatePostAction } from "@/features/posts/actions";
import type { ParsedUpload } from "@/lib/content/parse-upload";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_LABEL, validateFileMeta } from "@/lib/content/file-validation";
import { AppError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { normalizeTagName, TAG_MAX_COUNT, TAG_MAX_LENGTH } from "@/lib/text";
import { fieldErrorsOf, POST_TITLE_MAX, postInputSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";

export interface EditorInitial {
  postId: string;
  title: string;
  content: string;
  html: string;
  tags: string[];
  visibility: "public" | "private";
  sourceFormat: "docx" | "markdown";
}

type Draft = Omit<EditorInitial, "postId"> & { fileName?: string; warnings: string[] };

function Dropzone({ onParsed, compact }: { onParsed: (p: ParsedUpload, fileName: string) => void; compact?: boolean }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      validateFileMeta(file); // 빠른 피드백용. 서버에서 실제 형식/크기를 다시 검증한다.
    } catch (err) {
      setError(err instanceof AppError ? err.message : "파일을 확인할 수 없습니다.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads/parse", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as { ok: true; data: ParsedUpload } | { ok: false; error: string } | null;
      if (!json) setError("파일을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      else if (!json.ok) setError(json.error);
      else onParsed(json.data, file.name);
    } catch {
      setError("네트워크 오류로 파일을 올리지 못했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handle(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed text-center transition-colors focus-within:border-accent",
          compact ? "px-4 py-6" : "px-6 py-16",
          dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:bg-paper-deep/60",
        )}
      >
        {uploading ? (
          <Spinner label="본문을 읽는 중…" />
        ) : (
          <>
            <span aria-hidden className={cn("text-accent", compact ? "text-2xl" : "text-4xl")}>
              ⇪
            </span>
            <span className={cn("font-serif font-bold text-ink", compact ? "mt-1 text-base" : "mt-3 text-lg")}>
              {compact ? "새 파일로 본문 바꾸기" : "에세이 파일을 끌어다 놓거나 클릭해서 선택하세요"}
            </span>
            <span className="mt-1.5 text-sm text-muted">Word(.docx), Markdown(.md, .markdown) · 최대 {MAX_UPLOAD_LABEL}</span>
          </>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          disabled={uploading}
          onChange={(e) => void handle(e.target.files?.[0])}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </label>
      {error && (
        <Alert tone="error" className="mt-3">
          <span id={`${inputId}-error`}>{error}</span>
        </Alert>
      )}
    </div>
  );
}

function TagInput({ tags, onChange, error }: { tags: string[]; onChange: (t: string[]) => void; error?: string }) {
  const [value, setValue] = useState("");
  const add = (raw: string) => {
    const name = normalizeTagName(raw);
    if (!name) return;
    if (tags.length >= TAG_MAX_COUNT || tags.some((t) => t.toLowerCase() === name.toLowerCase())) {
      setValue("");
      return;
    }
    onChange([...tags, name]);
    setValue("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter 무시
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(value);
    } else if (e.key === "Backspace" && !value && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };
  return (
    <Field id="tags" label="태그" hint={`Enter 또는 쉼표로 추가 · 최대 ${TAG_MAX_COUNT}개, 각 ${TAG_MAX_LENGTH}자`} error={error}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-strong bg-surface px-2.5 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pr-1.5 pl-3 text-sm text-accent-strong">
            #{t}
            <button
              type="button"
              aria-label={`${t} 태그 삭제`}
              className="rounded-full px-1.5 hover:bg-accent/15"
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          id="tags"
          value={value}
          maxLength={TAG_MAX_LENGTH + 1}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(value)}
          disabled={tags.length >= TAG_MAX_COUNT}
          placeholder={tags.length >= TAG_MAX_COUNT ? "태그를 모두 추가했습니다" : "예: 일상, 여행"}
          className="h-8 min-w-32 flex-1 bg-transparent px-1 text-[15px] focus:outline-none"
        />
      </div>
    </Field>
  );
}

export function PostEditor({ initial }: { initial?: EditorInitial }) {
  const router = useRouter();
  const mode = initial ? "edit" : "create";
  const [draft, setDraft] = useState<Draft | null>(
    initial
      ? {
          title: initial.title,
          content: initial.content,
          html: initial.html,
          tags: initial.tags,
          visibility: initial.visibility,
          sourceFormat: initial.sourceFormat,
          warnings: [],
        }
      : null,
  );
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [bodyTab, setBodyTab] = useState<"preview" | "source">("preview");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [previewStale, setPreviewStale] = useState(false);
  const [pending, startTransition] = useTransition();

  function onParsed(p: ParsedUpload, fileName: string) {
    setDraft((prev) => ({
      title: prev?.title || p.suggestedTitle,
      content: p.content,
      html: p.html,
      tags: prev?.tags ?? [],
      visibility: prev?.visibility ?? "public",
      sourceFormat: p.format,
      fileName,
      warnings: p.warnings,
    }));
    setPreviewStale(false);
    setBodyTab("preview");
    setErrors({});
  }

  if (!draft) {
    return (
      <div className="space-y-6">
        <Dropzone onParsed={onParsed} />
        <ul className="space-y-1.5 text-sm text-muted">
          <li>· 파일의 첫 줄이 제목(# 제목 또는 Word ‘제목’ 스타일)이면 자동으로 제목이 채워집니다.</li>
          <li>· Word 문서는 제목, 문단, 목록, 굵게/기울임을 가져옵니다. 이미지와 표 서식은 가져오지 않습니다.</li>
          <li>· 원본 파일은 서버에 보관하지 않고, 추출한 본문만 저장합니다.</li>
        </ul>
      </div>
    );
  }

  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  function refreshPreview(next: () => void = () => {}) {
    if (!previewStale) return next();
    startTransition(async () => {
      const res = await previewMarkdownAction(draft!.content);
      if (res.ok) {
        setDraft((d) => (d ? { ...d, html: res.data.html } : d));
        setPreviewStale(false);
        next();
      } else setFormError(res.error);
    });
  }

  function validate(): boolean {
    const parsed = postInputSchema.safeParse({ ...draft });
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      setFormError("입력값을 확인해 주세요.");
      return false;
    }
    setErrors({});
    setFormError(null);
    return true;
  }

  function submit() {
    const input = {
      title: draft!.title,
      content: draft!.content,
      tags: draft!.tags,
      visibility: draft!.visibility,
      sourceFormat: draft!.sourceFormat,
    };
    startTransition(async () => {
      const res = initial ? await updatePostAction(initial.postId, input) : await createPostAction(input);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        setStep("edit");
        return;
      }
      router.push(`/posts/${res.data.id}?${mode === "create" ? "published" : "updated"}=1`);
      router.refresh();
    });
  }

  if (step === "review") {
    return (
      <div className="space-y-8">
        <Alert tone="info">게시하기 전에 마지막으로 확인해 주세요. 게시 후에도 언제든 수정하거나 삭제할 수 있습니다.</Alert>
        <dl className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">공개 범위</dt>
            <dd className="mt-1 font-medium text-ink">{draft.visibility === "public" ? "전체 공개" : "🔒 비공개 (나만 보기)"}</dd>
          </div>
          <div>
            <dt className="text-muted">태그</dt>
            <dd className="mt-1 font-medium text-ink">{draft.tags.length ? draft.tags.map((t) => `#${t}`).join(" ") : "없음"}</dd>
          </div>
          <div>
            <dt className="text-muted">본문 형식</dt>
            <dd className="mt-1 font-medium text-ink">{draft.sourceFormat === "docx" ? "Word 문서에서 추출" : "Markdown"}</dd>
          </div>
        </dl>
        <article className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-8 sm:px-10">
          <h2 className="font-serif text-3xl font-bold text-ink">{draft.title}</h2>
          <div className="essay-body mt-8" dangerouslySetInnerHTML={{ __html: draft.html }} />
        </article>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={() => setStep("edit")} disabled={pending}>
            돌아가서 수정
          </Button>
          <Button size="lg" onClick={submit} disabled={pending}>
            {pending ? "저장 중…" : mode === "create" ? "게시하기" : "수정 내용 저장"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (validate()) refreshPreview(() => setStep("review"));
      }}
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      {draft.fileName && (
        <Alert tone="success">
          <strong className="font-semibold">{draft.fileName}</strong> 에서 본문을 가져왔습니다.
          {draft.warnings.length > 0 && <span className="block text-xs opacity-80">일부 서식은 변환되지 않았을 수 있습니다.</span>}
        </Alert>
      )}

      <Field id="title" label="제목" error={errors.title}>
        <Input
          id="title"
          value={draft.title}
          maxLength={POST_TITLE_MAX}
          onChange={(e) => update({ title: e.target.value })}
          aria-invalid={!!errors.title}
          className="font-serif text-lg"
        />
      </Field>

      <TagInput tags={draft.tags} onChange={(tags) => update({ tags })} error={errors.tags} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">공개 범위</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["public", "전체 공개", "누구나 읽고 검색할 수 있어요."],
              ["private", "비공개", "나만 볼 수 있어요. 목록과 검색에 나오지 않아요."],
            ] as const
          ).map(([value, label, desc]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                draft.visibility === value ? "border-accent bg-accent-soft/50" : "border-line-strong bg-surface",
              )}
            >
              <input
                type="radio"
                name="visibility"
                value={value}
                checked={draft.visibility === value}
                onChange={() => update({ visibility: value })}
                className="mt-1 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{label}</span>
                <span className="block text-xs text-muted">{desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <span className="text-sm font-medium text-ink" id="body-label">
            본문
          </span>
          <div role="tablist" aria-labelledby="body-label" className="inline-flex rounded-full border border-line-strong bg-surface p-0.5 text-sm">
            {(
              [
                ["preview", "미리보기"],
                ["source", "Markdown 편집"],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={bodyTab === tab}
                aria-controls={`panel-${tab}`}
                onClick={() => (tab === "preview" ? refreshPreview(() => setBodyTab("preview")) : setBodyTab("source"))}
                className={cn("rounded-full px-3.5 py-1.5", bodyTab === tab ? "bg-ink text-paper" : "text-ink-soft hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {bodyTab === "preview" ? (
          <div id="panel-preview" role="tabpanel" className="max-h-[60vh] overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface px-5 py-6 sm:px-8">
            {pending && previewStale ? <Spinner label="미리보기 만드는 중…" /> : <div className="essay-body" dangerouslySetInnerHTML={{ __html: draft.html }} />}
          </div>
        ) : (
          <div id="panel-source" role="tabpanel">
            <label htmlFor="content" className="sr-only">
              Markdown 본문
            </label>
            <Textarea
              id="content"
              rows={18}
              value={draft.content}
              onChange={(e) => {
                update({ content: e.target.value });
                setPreviewStale(true);
              }}
              aria-invalid={!!errors.content}
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted">HTML 태그와 스크립트는 저장 시 제거됩니다.</p>
          </div>
        )}
        {errors.content && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {errors.content}
          </p>
        )}
        {mode === "edit" && (
          <p className="mt-2 text-xs text-muted">본문을 수정하면 독자가 저장한 하이라이트의 위치가 달라질 수 있습니다. 위치를 찾지 못한 하이라이트는 목록에만 남습니다.</p>
        )}
      </div>

      <details className="rounded-lg border border-line bg-paper-deep/40 p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink-soft">{mode === "edit" ? "파일로 본문 교체하기" : "다른 파일 올리기"}</summary>
        <div className="mt-4">
          <Dropzone compact onParsed={onParsed} />
        </div>
      </details>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-6 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="lg" onClick={() => router.back()} disabled={pending}>
          취소
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          검토하기
        </Button>
      </div>
    </form>
  );
}
