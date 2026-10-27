import type { Metadata } from "next";
import Link from "next/link";
import { HighlightDeleteButton } from "@/components/highlights/highlight-delete-button";
import { MyNav } from "@/components/layout/my-nav";
import { Container, PageHeader } from "@/components/layout/page-header";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { requireViewerOrRedirect } from "@/lib/auth/session";
import { formatDate, toIso } from "@/lib/format";
import { listMyHighlights } from "@/features/highlights/service";

export const metadata: Metadata = { title: "내 하이라이트" };

export default async function MyHighlightsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireViewerOrRedirect("/my/highlights");
  const { q } = await searchParams;
  const query = q?.slice(0, 100);
  const { items, hiddenCount } = await listMyHighlights(viewer, { q: query });

  return (
    <Container>
      <div className="pt-10">
        <PageHeader eyebrow="Highlights" title="내 하이라이트" description="읽다가 마음에 남은 문장들입니다. 나만 볼 수 있어요." />
        <MyNav current="/my/highlights" />

        <form method="get" role="search" className="mb-8 flex max-w-lg gap-2">
          <label htmlFor="hq" className="sr-only">
            하이라이트 검색
          </label>
          <input
            id="hq"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            placeholder="문장 또는 글 제목으로 찾기"
            className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
          />
          <button type="submit" className={buttonClass("secondary")}>
            찾기
          </button>
        </form>

        {items.length === 0 ? (
          <EmptyState
            title={query ? "찾는 문장이 없습니다." : "아직 저장한 문장이 없습니다."}
            description={query ? undefined : "글을 읽다가 마음에 드는 문장을 선택하면 이곳에 모입니다."}
            action={!query ? <LinkButton href="/explore">글 읽으러 가기</LinkButton> : undefined}
          />
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {items.map((h) => (
              <li key={h.id} className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-6">
                <blockquote className="flex-1">
                  <Link href={`/posts/${h.postId}`} className="block font-serif text-[17px] leading-relaxed text-ink hover:text-accent-strong">
                    <span className="bg-mark/60 box-decoration-clone px-0.5">{h.selectedText}</span>
                  </Link>
                </blockquote>
                {h.orphaned && (
                  <p className="mt-3 text-xs text-danger">
                    <span aria-hidden>⚠ </span>글 본문이 수정되어 원래 위치를 찾을 수 없습니다. 문장은 그대로 보관됩니다.
                  </p>
                )}
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                  <p className="min-w-0 text-muted">
                    <Link href={`/posts/${h.postId}`} className="font-medium text-ink-soft hover:underline">
                      {h.postTitle}
                    </Link>
                    <span className="block text-xs">
                      {h.authorName} · <time dateTime={toIso(h.createdAt)}>{formatDate(h.createdAt)}</time> 저장
                    </span>
                  </p>
                  <HighlightDeleteButton id={h.id} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {hiddenCount > 0 && (
          <p className="mt-8 text-sm text-muted">작성자가 비공개로 바꾸거나 숨김 처리된 글의 하이라이트 {hiddenCount}개는 표시하지 않습니다.</p>
        )}
      </div>
    </Container>
  );
}
