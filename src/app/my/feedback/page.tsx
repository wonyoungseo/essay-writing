import type { Metadata } from "next";
import Link from "next/link";
import { MyNav } from "@/components/layout/my-nav";
import { Container, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { requireViewerOrRedirect } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDateTime, toIso } from "@/lib/format";
import { listCommentsByAuthor, listCommentsOnMyPosts } from "@/features/comments/service";

export const metadata: Metadata = { title: "피드백" };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireViewerOrRedirect("/my/feedback");
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "given" ? "given" : "received";
  const items = tab === "given" ? await listCommentsByAuthor(viewer) : await listCommentsOnMyPosts(viewer);

  return (
    <Container>
      <div className="pt-10">
        <PageHeader eyebrow="Feedback" title="피드백" description="내 글에 남겨진 감상과, 내가 다른 글에 남긴 감상을 모아 봅니다." />
        <MyNav current="/my/feedback" />
        <div className="mb-6 flex gap-2" role="group" aria-label="피드백 종류">
          {(
            [
              ["received", "내가 받은 피드백"],
              ["given", "내가 남긴 피드백"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={`/my/feedback?tab=${key}`}
              aria-current={tab === key ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm",
                tab === key ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft hover:bg-paper-deep",
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {items.length === 0 ? (
          <EmptyState
            title={tab === "given" ? "아직 남긴 피드백이 없습니다." : "아직 받은 피드백이 없습니다."}
            description={tab === "given" ? "다른 사람의 글을 읽고 감상을 남겨 보세요." : "글을 공개하면 독자의 감상이 이곳에 모입니다."}
          />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {items.map((c) => (
              <li key={c.id} className="py-5">
                <p className="text-sm text-muted">
                  {tab === "received" && <span className="font-semibold text-ink">{c.authorName}</span>}
                  {tab === "received" ? " 님이 " : ""}
                  <Link href={`/posts/${c.postId}#comment-${c.id}`} className="font-medium text-accent hover:underline">
                    {c.postTitle}
                  </Link>
                  {tab === "received" ? " 에 남긴 감상" : " 에 남긴 감상"}
                  <span className="ml-2 text-xs">
                    <time dateTime={toIso(c.createdAt)}>{formatDateTime(c.createdAt)}</time>
                  </span>
                </p>
                <p className="mt-2 line-clamp-4 font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-ink-soft">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
