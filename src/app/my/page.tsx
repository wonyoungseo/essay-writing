import type { Metadata } from "next";
import Link from "next/link";
import { MyNav } from "@/components/layout/my-nav";
import { Container, PageHeader } from "@/components/layout/page-header";
import { PostGrid } from "@/components/posts/post-card";
import { LinkButton } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { requireViewerOrRedirect } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { countCommentsByAuthor } from "@/features/comments/service";
import { countHighlights } from "@/features/highlights/service";
import { getAuthorStats, searchPosts } from "@/features/posts/service";

export const metadata: Metadata = { title: "내 공간" };

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "public", label: "공개" },
  { key: "private", label: "비공개" },
] as const;

export default async function MyPage({ searchParams }: { searchParams: Promise<{ v?: string; page?: string; deleted?: string }> }) {
  const viewer = await requireViewerOrRedirect("/my");
  const sp = await searchParams;
  const filter = sp.v === "public" || sp.v === "private" ? sp.v : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, stats, highlightCount, commentCount] = await Promise.all([
    searchPosts(viewer, { scope: "mine", page, visibility: filter === "all" ? undefined : filter }),
    getAuthorStats(viewer.id),
    countHighlights(viewer),
    countCommentsByAuthor(viewer.id),
  ]);

  const statItems = [
    { label: "올린 글", value: stats.postCount, href: "/my" },
    { label: "공개 글", value: stats.publicCount, href: "/my?v=public" },
    { label: "저장한 문장", value: highlightCount, href: "/my/highlights" },
    { label: "남긴 피드백", value: commentCount, href: "/my/feedback?tab=given" },
  ];

  return (
    <Container>
      <div className="pt-10">
        <PageHeader
          eyebrow="My"
          title={`${viewer.name}님의 공간`}
          actions={<LinkButton href="/upload">글 올리기</LinkButton>}
        />
        <MyNav current="/my" />
        {sp.deleted && (
          <Alert tone="success" className="mb-6">
            글을 삭제했습니다.
          </Alert>
        )}

        <ul className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statItems.map((s) => (
            <li key={s.label}>
              <Link href={s.href} className="block rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:border-line-strong">
                <span className="block text-xs text-muted">{s.label}</span>
                <span className="mt-1 block font-serif text-2xl font-bold text-ink">{s.value}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mb-5 flex items-center gap-2" role="group" aria-label="공개 범위 필터">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/my" : `/my?v=${f.key}`}
              aria-current={filter === f.key ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm",
                filter === f.key ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft hover:bg-paper-deep",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {result.items.length > 0 ? (
          <>
            <PostGrid posts={result.items} showStatus />
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              hrefFor={(p) => `/my?${new URLSearchParams({ ...(filter !== "all" ? { v: filter } : {}), page: String(p) })}`}
            />
          </>
        ) : (
          <EmptyState
            title={filter === "all" ? "아직 올린 글이 없습니다." : "해당하는 글이 없습니다."}
            description="Word 나 Markdown 으로 쓴 에세이를 올려 보세요."
            action={<LinkButton href="/upload">첫 글 올리기</LinkButton>}
          />
        )}
      </div>
    </Container>
  );
}
