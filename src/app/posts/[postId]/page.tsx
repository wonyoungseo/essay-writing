import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/feedback/comment-section";
import { ReportButton } from "@/components/feedback/report-button";
import { HighlightableBody } from "@/components/highlights/highlightable-body";
import { Container } from "@/components/layout/page-header";
import { PostOwnerActions } from "@/components/posts/post-owner-actions";
import { Alert, Badge } from "@/components/ui/feedback";
import { TagLink } from "@/components/ui/tag";
import { getViewer } from "@/lib/auth/session";
import { formatDate, toIso } from "@/lib/format";
import { canDeletePost, canEditPost, canInteractWithPost, isAdmin } from "@/lib/permissions";
import { listComments } from "@/features/comments/service";
import { listHighlightsForPost } from "@/features/highlights/service";
import { getPostForViewer, listRelatedPosts } from "@/features/posts/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ postId: string }>; searchParams?: Promise<{ published?: string; updated?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPostForViewer(await getViewer(), postId);
  if (!post) return { title: "글을 찾을 수 없습니다" };
  return {
    title: post.title,
    description: post.excerpt,
    robots: post.visibility === "private" ? { index: false } : undefined,
  };
}

export default async function PostPage({ params, searchParams }: Params) {
  const { postId } = await params;
  const notice = (await searchParams) ?? {};
  const viewer = await getViewer();
  const post = await getPostForViewer(viewer, postId);
  if (!post) notFound();

  const canInteract = canInteractWithPost(viewer, post);
  const [comments, highlights, related] = await Promise.all([
    listComments(viewer, post.id),
    viewer && canInteract ? listHighlightsForPost(viewer, post.id) : Promise.resolve([]),
    listRelatedPosts(post),
  ]);
  const loginHref = `/login?next=${encodeURIComponent(`/posts/${post.id}`)}`;
  const date = post.publishedAt ?? post.createdAt;
  const wasEdited = post.updatedAt.getTime() - post.createdAt.getTime() > 60_000;
  const isOwner = viewer?.id === post.authorId;

  return (
    <Container size="reading">
      <article className="pt-8 pb-4 sm:pt-12">
        <Link href="/explore" className="text-sm text-muted hover:text-ink">
          ← 글 목록
        </Link>

        {(notice.published || notice.updated) && (
          <Alert tone="success" className="mt-6">
            {notice.published ? "글이 게시되었습니다." : "수정 내용을 저장했습니다."}
          </Alert>
        )}

        {post.status === "hidden" && (
          <Alert tone="warning" className="mt-6">
            관리자에 의해 숨김 처리된 글입니다. 작성자 본인에게만 보입니다.
          </Alert>
        )}

        <header className="mt-8 border-b border-line pb-8">
          {post.visibility === "private" && (
            <p className="mb-3">
              <Badge>🔒 비공개 · 나만 볼 수 있어요</Badge>
            </p>
          )}
          <h1 className="font-serif text-3xl leading-tight font-bold text-ink sm:text-4xl">{post.title}</h1>
          <p className="mt-4 text-sm text-muted">
            <span className="font-medium text-ink-soft">{post.authorName}</span>
            {" · "}
            <time dateTime={toIso(date)}>{formatDate(date)}</time>
            {wasEdited && (
              <>
                {" · 수정 "}
                <time dateTime={toIso(post.updatedAt)}>{formatDate(post.updatedAt)}</time>
              </>
            )}
          </p>
          {post.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="태그">
              {post.tags.map((t) => (
                <li key={t.slug}>
                  <TagLink name={t.name} slug={t.slug} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {(isOwner || isAdmin(viewer)) && (
              <PostOwnerActions
                postId={post.id}
                canEdit={canEditPost(viewer, post)}
                canDelete={canDeletePost(viewer, post)}
                isAdminViewer={isAdmin(viewer)}
                hidden={post.status === "hidden"}
              />
            )}
            {viewer && !isOwner && <ReportButton postId={post.id} label="이 글 신고" />}
          </div>
        </header>

        <p className="mt-6 mb-8 text-xs text-muted">
          <span aria-hidden>✎ </span>마음에 드는 문장을 선택하면 하이라이트로 저장할 수 있어요.
        </p>

        <HighlightableBody
          postId={post.id}
          html={post.html}
          contentText={post.contentText}
          initialHighlights={highlights}
          canHighlight={!!viewer && canInteract}
          loginHref={loginHref}
        />

        <CommentSection
          postId={post.id}
          comments={comments}
          viewerId={viewer?.id ?? null}
          viewerIsAdmin={isAdmin(viewer)}
          canComment={!!viewer && canInteract}
          loginHref={loginHref}
        />
      </article>

      {related.length > 0 && (
        <nav aria-labelledby="related-heading" className="mt-10 border-t border-line pt-10">
          <h2 id="related-heading" className="mb-4 font-serif text-lg font-bold text-ink">
            이어서 읽어 볼 글
          </h2>
          <ul className="space-y-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/posts/${r.id}`} className="group block rounded-lg border border-line bg-surface px-5 py-4 hover:border-line-strong">
                  <span className="font-serif font-bold text-ink group-hover:underline">{r.title}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {r.authorName}
                    {r.tags.length > 0 && ` · ${r.tags.map((t) => `#${t.name}`).join(" ")}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </Container>
  );
}
