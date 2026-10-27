import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/layout/page-header";
import { PostGrid } from "@/components/posts/post-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { TagLink } from "@/components/ui/tag";
import { getViewer } from "@/lib/auth/session";
import { searchParamsSchema, type SearchParams } from "@/lib/validation";
import { listPopularTags, searchPosts } from "@/features/posts/service";

export const metadata: Metadata = { title: "글 탐색" };
export const dynamic = "force-dynamic";

function buildHref(params: SearchParams, patch: Partial<SearchParams>) {
  const merged = { ...params, ...patch };
  const qs = new URLSearchParams();
  if (merged.q) qs.set("q", merged.q);
  if (merged.field !== "all") qs.set("field", merged.field);
  if (merged.tag) qs.set("tag", merged.tag);
  if (merged.sort !== "latest") qs.set("sort", merged.sort);
  if (merged.scope !== "public") qs.set("scope", merged.scope);
  if (merged.page > 1) qs.set("page", String(merged.page));
  const s = qs.toString();
  return s ? `/explore?${s}` : "/explore";
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const params = searchParamsSchema.parse(flat);
  const viewer = await getViewer();
  const [result, tags] = await Promise.all([searchPosts(viewer, params), listPopularTags(20)]);
  const activeTag = tags.find((t) => t.slug === params.tag);
  const hasFilter = !!(params.q || params.tag || params.scope === "mine");

  return (
    <Container>
      <div className="pt-10">
        <PageHeader
          eyebrow="Explore"
          title="글 탐색"
          description="제목, 작성자, 태그로 찾고 최신순이나 인기순으로 정렬할 수 있습니다."
        />

        <form action="/explore" method="get" role="search" className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div className="space-y-1.5">
            <label htmlFor="q" className="text-xs font-medium text-muted">
              검색어
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q}
              maxLength={100}
              placeholder="검색어를 입력하세요"
              className="h-11 w-full rounded-lg border border-line-strong bg-paper px-3.5 text-[15px] focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="field" className="text-xs font-medium text-muted">
              검색 범위
            </label>
            <Select id="field" name="field" defaultValue={params.field}>
              <option value="all">전체</option>
              <option value="title">제목</option>
              <option value="author">작성자</option>
              <option value="tag">태그</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sort" className="text-xs font-medium text-muted">
              정렬
            </label>
            <Select id="sort" name="sort" defaultValue={params.sort}>
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
            </Select>
          </div>
          {params.tag && <input type="hidden" name="tag" value={params.tag} />}
          <div className="flex gap-2">
            {viewer && (
              <div className="space-y-1.5">
                <label htmlFor="scope" className="text-xs font-medium text-muted">
                  대상
                </label>
                <Select id="scope" name="scope" defaultValue={params.scope}>
                  <option value="public">공개된 글</option>
                  <option value="mine">내 글 (비공개 포함)</option>
                </Select>
              </div>
            )}
            <button type="submit" className={buttonClass("primary", "md", "h-11 self-end")}>
              적용
            </button>
          </div>
        </form>

        {tags.length > 0 && (
          <div className="mt-5">
            <p className="sr-only">태그로 거르기</p>
            <ul className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <li key={t.slug}>
                  <TagLink name={t.name} slug={t.slug} active={t.slug === params.tag} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 mb-5 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
          <p className="text-sm text-ink-soft">
            {params.q && (
              <>
                <strong className="font-semibold text-ink">‘{params.q}’</strong> 검색 결과{" "}
              </>
            )}
            {activeTag && (
              <>
                <strong className="font-semibold text-ink">#{activeTag.name}</strong>{" "}
              </>
            )}
            총 {result.total}편
          </p>
          {hasFilter && (
            <Link href="/explore" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              조건 초기화
            </Link>
          )}
        </div>

        {result.items.length > 0 ? (
          <>
            <PostGrid posts={result.items} showStatus={params.scope === "mine"} />
            <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(page) => buildHref(params, { page })} />
          </>
        ) : (
          <EmptyState
            title={hasFilter ? "조건에 맞는 글이 없습니다." : "아직 올라온 글이 없습니다."}
            description={hasFilter ? "검색어를 바꾸거나 다른 태그를 선택해 보세요." : undefined}
            action={
              hasFilter ? (
                <Link href="/explore" className={buttonClass("secondary")}>
                  전체 글 보기
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </Container>
  );
}
