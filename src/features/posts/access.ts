import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { forbidden, notFound } from "@/lib/errors";
import { canInteractWithPost, canViewPost, type PostAccessInfo, type Viewer } from "@/lib/permissions";

export type PostAccessRow = PostAccessInfo & { id: string; title: string; contentText: string };

async function loadAccessRow(postId: string): Promise<PostAccessRow | null> {
  const [row] = await db
    .select({
      id: posts.id,
      title: posts.title,
      authorId: posts.authorId,
      visibility: posts.visibility,
      status: posts.status,
      contentText: posts.contentText,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  return row ?? null;
}

/** 댓글/하이라이트 등 참여 작업 전에 호출: 볼 수 없는 글은 404, 숨김 글은 403 */
export async function assertCanInteract(viewer: Viewer, postId: string): Promise<PostAccessRow> {
  const post = await loadAccessRow(postId);
  if (!post || !canViewPost(viewer, post)) throw notFound("글을 찾을 수 없습니다.");
  if (!canInteractWithPost(viewer, post)) throw forbidden("이 글에는 감상이나 하이라이트를 남길 수 없습니다.");
  return post;
}

export async function assertCanView(viewer: Viewer | null, postId: string): Promise<PostAccessRow> {
  const post = await loadAccessRow(postId);
  if (!post || !canViewPost(viewer, post)) throw notFound("글을 찾을 수 없습니다.");
  return post;
}
