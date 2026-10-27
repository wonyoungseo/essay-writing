import { and, count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { comments, notifications, posts, users } from "@/lib/db/schema";
import type { Viewer } from "@/lib/permissions";

type Executor = Pick<typeof db, "insert">;

/** 본인 활동에는 알림을 만들지 않는다. 이메일/푸시는 전송하지 않는다(인앱 알림만). */
export async function notify(
  exec: Executor,
  input: { recipientId: string; actorId: string; type: "comment"; postId: string; commentId?: string },
) {
  if (input.recipientId === input.actorId) return;
  await exec.insert(notifications).values(input);
}

const actor = alias(users, "actor");

export async function listNotifications(viewer: Viewer, limit = 50) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      postId: notifications.postId,
      postTitle: posts.title,
      actorName: actor.name,
      commentExcerpt: comments.content,
    })
    .from(notifications)
    .innerJoin(posts, eq(posts.id, notifications.postId))
    .innerJoin(actor, eq(actor.id, notifications.actorId))
    .leftJoin(comments, eq(comments.id, notifications.commentId))
    .where(eq(notifications.recipientId, viewer.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnread(viewer: Viewer): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, viewer.id), eq(notifications.isRead, false)));
  return row.n;
}

export async function markRead(viewer: Viewer, notificationId?: string) {
  const own = eq(notifications.recipientId, viewer.id);
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(notificationId ? and(own, eq(notifications.id, notificationId)) : own);
}
