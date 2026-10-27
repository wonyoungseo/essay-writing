import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { comments, posts, reports, users } from "@/lib/db/schema";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { isAdmin, type Viewer } from "@/lib/permissions";
import { fieldErrorsOf, reportInputSchema } from "@/lib/validation";
import { assertCanView } from "@/features/posts/access";

export async function createReport(viewer: Viewer, input: { postId: string; commentId?: string; reason: string }) {
  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "입력값을 확인해 주세요.", fieldErrorsOf(parsed.error));
  const { postId, commentId, reason } = parsed.data;
  const post = await assertCanView(viewer, postId);
  if (commentId) {
    const [c] = await db
      .select({ id: comments.id, authorId: comments.authorId })
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.postId, postId)))
      .limit(1);
    if (!c) throw notFound("댓글을 찾을 수 없습니다.");
    if (c.authorId === viewer.id) throw new AppError("VALIDATION", "본인이 작성한 댓글은 신고할 수 없습니다.");
  } else if (post.authorId === viewer.id) {
    throw new AppError("VALIDATION", "본인이 작성한 글은 신고할 수 없습니다.");
  }
  const inserted = await db
    .insert(reports)
    .values({ reporterId: viewer.id, targetType: commentId ? "comment" : "post", postId, commentId, reason })
    .onConflictDoNothing()
    .returning({ id: reports.id });
  if (inserted.length === 0) throw new AppError("CONFLICT", "이미 신고한 내용입니다.");
}

const reporter = alias(users, "reporter");

export async function listReports(viewer: Viewer, status: "open" | "resolved" | "dismissed" = "open") {
  if (!isAdmin(viewer)) throw forbidden("관리자만 사용할 수 있습니다.");
  return db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      postId: reports.postId,
      postTitle: posts.title,
      postStatus: posts.status,
      commentId: reports.commentId,
      commentContent: comments.content,
      reporterName: reporter.name,
    })
    .from(reports)
    .innerJoin(posts, eq(posts.id, reports.postId))
    .innerJoin(reporter, eq(reporter.id, reports.reporterId))
    .leftJoin(comments, eq(comments.id, reports.commentId))
    .where(eq(reports.status, status))
    .orderBy(desc(reports.createdAt))
    .limit(100);
}

export async function resolveReport(viewer: Viewer, reportId: string, status: "resolved" | "dismissed") {
  if (!isAdmin(viewer)) throw forbidden("관리자만 사용할 수 있습니다.");
  const updated = await db
    .update(reports)
    .set({ status, resolvedBy: viewer.id, resolvedAt: new Date() })
    .where(eq(reports.id, reportId))
    .returning({ id: reports.id });
  if (updated.length === 0) throw notFound("신고를 찾을 수 없습니다.");
}
