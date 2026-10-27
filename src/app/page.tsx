import { Container } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { PostGrid, RankedPostList } from "@/components/posts/post-card";
import { SearchBar } from "@/components/search/search-bar";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { TagLink } from "@/components/ui/tag";
import { getViewer } from "@/lib/auth/session";
import { listPopularTags, searchPosts } from "@/features/posts/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getViewer();
  const [latest, popular, tags] = await Promise.all([
    searchPosts(viewer, { sort: "latest", pageSize: 6 }),
    searchPosts(viewer, { sort: "popular", pageSize: 5 }),
    listPopularTags(),
  ]);
  const hasPosts = latest.items.length > 0;
  const popularWithEngagement = popular.items.filter((p) => p.commentCount > 0);

  return (
    <>
      <section className="border-b border-line bg-paper-deep/50">
        <Container size="narrow">
          <div className="py-12 text-center sm:py-16">
            {/* 대문 문구는 두지 않는다. 스크린 리더용 페이지 제목만 유지 */}
            <h1 className="sr-only">에세이 글쓰기</h1>
            <SearchBar size="lg" className="mx-auto max-w-xl" />
            <div className="mt-6 flex justify-center gap-2">
              <LinkButton href="/explore" variant="secondary" size="lg">
                글 둘러보기
              </LinkButton>
              <LinkButton href={viewer ? "/upload" : "/login?next=/upload"} size="lg">
                글 올리기
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>

      <Container>
        <Section title="최근 올라온 글" moreHref="/explore">
          {hasPosts ? (
            <PostGrid posts={latest.items} />
          ) : (
            <EmptyState
              title="아직 올라온 글이 없습니다."
              description="첫 번째 에세이를 올려 보세요. Word 나 Markdown 파일을 그대로 올리면 됩니다."
              action={<LinkButton href={viewer ? "/upload" : "/login?next=/upload"}>글 올리기</LinkButton>}
            />
          )}
        </Section>

        {popularWithEngagement.length > 0 && (
          <Section title="지금 많이 읽는 글" moreHref="/explore?sort=popular">
            <p className="-mt-3 mb-5 text-sm text-muted">감상이 많이 남겨진 순서입니다.</p>
            <RankedPostList posts={popularWithEngagement} />
          </Section>
        )}

        {tags.length > 0 && (
          <Section title="주제별 탐색">
            <ul className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <li key={t.slug}>
                  <TagLink name={`${t.name} ${t.postCount}`} slug={t.slug} />
                </li>
              ))}
            </ul>
          </Section>
        )}
      </Container>
    </>
  );
}
