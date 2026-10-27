import type { Metadata } from "next";
import Link from "next/link";
import { MarkAllReadButton } from "@/components/layout/mark-read-button";
import { MyNav } from "@/components/layout/my-nav";
import { Container, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { requireViewerOrRedirect } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDateTime, toIso } from "@/lib/format";
import { listNotifications } from "@/features/notifications/service";

export const metadata: Metadata = { title: "알림" };

export default async function NotificationsPage() {
  const viewer = await requireViewerOrRedirect("/notifications");
  const items = await listNotifications(viewer);
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <Container>
      <div className="pt-10">
        <PageHeader
          eyebrow="Notifications"
          title="알림"
          description="내 글에 새 감상이 남겨지면 이곳에 알려 드립니다. 이메일이나 푸시는 보내지 않습니다."
          actions={unread > 0 ? <MarkAllReadButton /> : undefined}
        />
        <MyNav current="/notifications" />
        {items.length === 0 ? (
          <EmptyState title="새로운 알림이 없습니다." />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {items.map((n) => (
              <li key={n.id} className={cn("flex gap-4 py-4", !n.isRead && "bg-accent-soft/30")}>
                <span aria-hidden className="mt-0.5 w-6 text-center text-lg">
                  💬
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    {!n.isRead && <span className="mr-1.5 inline-block rounded bg-accent px-1.5 text-[11px] font-semibold text-paper">새 알림</span>}
                    <strong className="font-semibold">{n.actorName}</strong> 님이{" "}
                    <Link href={`/posts/${n.postId}`} className="font-medium text-accent hover:underline">
                      {n.postTitle}
                    </Link>
                    {" 에 감상을 남겼습니다."}
                  </p>
                  {n.commentExcerpt && <p className="mt-1 line-clamp-2 text-sm text-muted">“{n.commentExcerpt}”</p>}
                  <p className="mt-1 text-xs text-muted">
                    <time dateTime={toIso(n.createdAt)}>{formatDateTime(n.createdAt)}</time>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
