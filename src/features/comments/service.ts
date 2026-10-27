import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, posts, users } from "@/lib/db/schema";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { canDeleteComment, canEditComment, type Viewer } from "@/lib/permissions";
import { commentInputSchema, commentUpdateSchema, fieldErrorsOf } from "@/lib/validation";
import { assertCanInteract, assertCanView } from "@/features/posts/access";
import { notify } from "@/features/notifications/service";

export interface CommentView {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentColumns = {
  id: comments.id,
  postId: comments.postId,
  authorId: comments.authorId,
  authorName: users.name,
  content: comments.content,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt,
};

export async function listComments(viewer: Viewer | null, postId: string): Promise<CommentView[]> {
  await assertCanView(viewer, postId);
  return db
    .select(commentColumns)
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));
}

export async function createComment(viewer: Viewer, input: { postId: string; content: string }): Promise<CommentView> {
  const parsed = commentInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "입력값을 확인해 주세요.", fieldErrorsOf(parsed.error));
  const post = await assertCanInteract(viewer, parsed.data.postId);
  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(comments)
      .values({ postId: post.id, authorId: viewer.id, content: parsed.data.content })
      .returning();
    await notify(tx, { recipientId: post.authorId, actorId: viewer.id, type: "comment", postId: post.id, commentId: row.id });
    return row;
  });
  return { ...created, authorName: viewer.name };
}

async function loadComment(commentId: string) {
  const [row] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  return row ?? null;
}

export async function updateComment(viewer: Viewer, input: { commentId: string; content: string }): Promise<void> {
  const parsed = commentUpdateSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "입력값을 확인해 주세요.", fieldErrorsOf(parsed.error));
  const existing = await loadComment(parsed.data.commentId);
  if (!existing) throw notFound("댓글을 찾을 수 없습니다.");
  if (!canEditComment(viewer, existing)) throw forbidden("본인이 작성한 댓글만 수정할 수 있습니다.");
  await db.update(comments).set({ content: parsed.data.content }).where(eq(comments.id, existing.id));
}

export async function deleteComment(viewer: Viewer, commentId: string): Promise<{ postId: string }> {
  const existing = await loadComment(commentId);
  if (!existing) throw notFound("댓글을 찾을 수 없습니다.");
  if (!canDeleteComment(viewer, existing)) throw forbidden("본인이 작성한 댓글만 삭제할 수 있습니다.");
  await db.delete(comments).where(eq(comments.id, existing.id));
  return { postId: existing.postId };
}

/** 내가 남긴 피드백 */
export async function listCommentsByAuthor(viewer: Viewer, limit = 50) {
  return db
    .select({ ...commentColumns, postTitle: posts.title })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(eq(comments.authorId, viewer.id))
    .orderBy(desc(comments.createdAt))
    .limit(limit);
}

/** 내가 받은 피드백 (내 글에 달린 다른 사람의 댓글) */
export async function listCommentsOnMyPosts(viewer: Viewer, limit = 50) {
  return db
    .select({ ...commentColumns, postTitle: posts.title })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(and(eq(posts.authorId, viewer.id)))
    .orderBy(desc(comments.createdAt))
    .limit(limit);
}

export async function countCommentsByAuthor(userId: string) {
  const [row] = await db.select({ n: count() }).from(comments).where(eq(comments.authorId, userId));
  return row.n;
}

/** 관리자용 최근 댓글 */
export async function listRecentComments(limit = 30) {
  return db
    .select({ ...commentColumns, postTitle: posts.title })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .innerJoin(posts, eq(posts.id, comments.postId))
    .orderBy(desc(comments.createdAt))
    .limit(limit);
}
