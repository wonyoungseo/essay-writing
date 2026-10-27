import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { highlights, posts, users } from "@/lib/db/schema";
import { AppError, notFound } from "@/lib/errors";
import type { Viewer } from "@/lib/permissions";
import { escapeLike } from "@/lib/text";
import { fieldErrorsOf, highlightInputSchema, type HighlightInput } from "@/lib/validation";
import { assertCanInteract, assertCanView } from "@/features/posts/access";
import { buildAnchor, resolveAnchor } from "./anchor";

export interface HighlightView {
  id: string;
  postId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  contextBefore: string;
  contextAfter: string;
  createdAt: Date;
}

const highlightColumns = {
  id: highlights.id,
  postId: highlights.postId,
  selectedText: highlights.selectedText,
  startOffset: highlights.startOffset,
  endOffset: highlights.endOffset,
  contextBefore: highlights.contextBefore,
  contextAfter: highlights.contextAfter,
  createdAt: highlights.createdAt,
};

/** 하이라이트는 개인 데이터: 항상 본인 것만 조회한다. */
export async function listHighlightsForPost(viewer: Viewer, postId: string): Promise<HighlightView[]> {
  await assertCanView(viewer, postId);
  return db
    .select(highlightColumns)
    .from(highlights)
    .where(and(eq(highlights.userId, viewer.id), eq(highlights.postId, postId)))
    .orderBy(highlights.startOffset);
}

/**
 * 저장 시 서버의 본문 텍스트(content_text)로 위치를 다시 확인한다.
 * 클라이언트가 보낸 텍스트가 본문에 없으면 거부하고, 오프셋과 문맥은 서버 기준으로 다시 계산한다.
 */
export async function createHighlight(
  viewer: Viewer,
  input: HighlightInput,
): Promise<{ highlight: HighlightView; duplicate: boolean }> {
  const parsed = highlightInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "선택한 문장을 저장할 수 없습니다.", fieldErrorsOf(parsed.error));
  const post = await assertCanInteract(viewer, parsed.data.postId);

  const resolved = resolveAnchor(post.contentText, parsed.data);
  if (!resolved) {
    throw new AppError("VALIDATION", "본문에서 선택한 문장을 찾을 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.");
  }
  const anchor = buildAnchor(post.contentText, resolved.start, resolved.end);

  const [inserted] = await db
    .insert(highlights)
    .values({ userId: viewer.id, postId: post.id, ...anchor })
    .onConflictDoNothing()
    .returning(highlightColumns);
  if (inserted) return { highlight: inserted, duplicate: false };

  const [existing] = await db
    .select(highlightColumns)
    .from(highlights)
    .where(
      and(
        eq(highlights.userId, viewer.id),
        eq(highlights.postId, post.id),
        eq(highlights.startOffset, anchor.startOffset),
        eq(highlights.endOffset, anchor.endOffset),
      ),
    )
    .limit(1);
  return { highlight: existing, duplicate: true };
}

export async function deleteHighlight(viewer: Viewer, highlightId: string): Promise<{ postId: string }> {
  const [deleted] = await db
    .delete(highlights)
    .where(and(eq(highlights.id, highlightId), eq(highlights.userId, viewer.id)))
    .returning({ postId: highlights.postId });
  // 다른 사람의 하이라이트는 존재 여부도 알리지 않는다.
  if (!deleted) throw notFound("하이라이트를 찾을 수 없습니다.");
  return deleted;
}

/** 마이페이지 목록: 지금도 읽을 수 있는 글의 하이라이트만 보여준다. */
export async function listMyHighlights(viewer: Viewer, options: { q?: string; limit?: number } = {}) {
  const accessible = or(
    and(eq(posts.status, "published"), eq(posts.visibility, "public")),
    eq(posts.authorId, viewer.id),
  )!;
  const own = eq(highlights.userId, viewer.id);
  const q = options.q?.trim();
  const pattern = q ? `%${escapeLike(q)}%` : "";
  const search = q ? or(ilike(highlights.selectedText, pattern), ilike(posts.title, pattern)) : undefined;

  const [items, [{ hiddenCount }]] = await Promise.all([
    db
      .select({ ...highlightColumns, postTitle: posts.title, authorName: users.name, contentText: posts.contentText })
      .from(highlights)
      .innerJoin(posts, eq(posts.id, highlights.postId))
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(and(own, accessible, search))
      .orderBy(desc(highlights.createdAt))
      .limit(options.limit ?? 200),
    db
      .select({ hiddenCount: count() })
      .from(highlights)
      .innerJoin(posts, eq(posts.id, highlights.postId))
      .where(and(own, sql`not (${accessible})`)),
  ]);

  return {
    items: items.map(({ contentText, ...h }) => ({
      ...h,
      // 본문이 수정되어 더 이상 위치를 찾을 수 없는 하이라이트 표시
      orphaned: resolveAnchor(contentText, h) === null,
    })),
    hiddenCount,
  };
}

export async function countHighlights(viewer: Viewer) {
  const [row] = await db.select({ n: count() }).from(highlights).where(eq(highlights.userId, viewer.id));
  return row.n;
}
