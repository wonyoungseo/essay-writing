import Link from "next/link";
import type { PostSummary } from "@/features/posts/service";
import { formatDate, toIso } from "@/lib/format";
import { Badge } from "@/components/ui/feedback";

export function PostCard({ post, showStatus = false }: { post: PostSummary; showStatus?: boolean }) {
  const date = post.publishedAt ?? post.createdAt;
  return (
    <article className="group relative flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)] transition-colors hover:border-line-strong">
      {showStatus && (post.visibility === "private" || post.status !== "published") && (
        <div className="mb-3 flex gap-1.5">
          {post.visibility === "private" && <Badge>🔒 비공개</Badge>}
          {post.status === "hidden" && <Badge tone="danger">관리자 숨김</Badge>}
        </div>
      )}
      <h3 className="font-serif text-lg leading-snug font-bold text-ink">
        <Link href={`/posts/${post.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">
          {post.title}
        </Link>
      </h3>
      <p className="mt-2 text-sm text-muted">
        {post.authorName} · <time dateTime={toIso(date)}>{formatDate(date)}</time>
      </p>
      {post.excerpt && <p className="mt-4 line-clamp-3 font-serif text-[15px] leading-relaxed text-ink-soft">{post.excerpt}</p>}
      <div className="mt-auto pt-5">
        {post.tags.length > 0 && (
          <p className="mb-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted">
            {post.tags.slice(0, 4).map((t) => (
              <span key={t.slug}>#{t.name}</span>
            ))}
          </p>
        )}
        <p className="text-xs text-muted">
          <span aria-hidden>💬 </span>댓글 {post.commentCount}
        </p>
      </div>
    </article>
  );
}

export function PostGrid({ posts, showStatus }: { posts: PostSummary[]; showStatus?: boolean }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <li key={p.id}>
          <PostCard post={p} showStatus={showStatus} />
        </li>
      ))}
    </ul>
  );
}

/** 인기 글: 번호가 붙은 목록형 */
export function RankedPostList({ posts }: { posts: PostSummary[] }) {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {posts.map((p, i) => (
        <li key={p.id} className="flex items-start gap-5 py-5">
          <span aria-hidden className="w-7 shrink-0 font-serif text-2xl leading-none text-accent">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/posts/${p.id}`} className="font-serif text-base font-bold text-ink hover:underline sm:text-lg">
              {p.title}
            </Link>
            <p className="mt-1 text-sm text-muted">
              {p.authorName} · 댓글 {p.commentCount}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
