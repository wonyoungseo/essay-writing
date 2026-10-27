import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, postTags, tags, users } from "@/lib/db/schema";
import { renderMarkdown } from "@/lib/content/markdown";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { canDeletePost, canEditPost, canViewPost, isActive, isAdmin, type Viewer } from "@/lib/permissions";
import { escapeLike, makeExcerpt, normalizeTags } from "@/lib/text";
import { fieldErrorsOf, postInputSchema, type PostInput, type SearchParams } from "@/lib/validation";

export const PAGE_SIZE = 12;

export interface PostSummary {
  id: string;
  title: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  visibility: "public" | "private";
  status: "draft" | "published" | "hidden";
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  commentCount: number;
  tags: { name: string; slug: string }[];
}

// 상관 서브쿼리에서는 바깥 테이블 컬럼을 반드시 테이블명으로 한정한다.
// (Drizzle 은 JOIN 이 없는 쿼리에서 컬럼명을 한정하지 않아, 서브쿼리 안의 "id" 가 다른 테이블로 해석될 수 있다)
const outerPostId = sql.raw(`"posts"."id"`);
const commentCountSql = sql<number>`(select count(*)::int from "comments" c where c."post_id" = ${outerPostId})`;
// 인기도: 저장된 댓글(감상) 수. 조회수는 수집하지 않는다.
const popularityScoreSql = commentCountSql;

const summaryColumns = {
  id: posts.id,
  title: posts.title,
  excerpt: posts.excerpt,
  authorId: posts.authorId,
  authorName: users.name,
  visibility: posts.visibility,
  status: posts.status,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
  publishedAt: posts.publishedAt,
  commentCount: commentCountSql,
};

const publicCondition = and(eq(posts.status, "published"), eq(posts.visibility, "public"))!;

async function attachTags<T extends { id: string }>(rows: T[]): Promise<(T & { tags: { name: string; slug: string }[] })[]> {
  if (rows.length === 0) return [];
  const tagRows = await db
    .select({ postId: postTags.postId, name: tags.name, slug: tags.slug })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(
      inArray(
        postTags.postId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(tags.name));
  const byPost = new Map<string, { name: string; slug: string }[]>();
  for (const t of tagRows) {
    const list = byPost.get(t.postId) ?? [];
    list.push({ name: t.name, slug: t.slug });
    byPost.set(t.postId, list);
  }
  return rows.map((r) => ({ ...r, tags: byPost.get(r.id) ?? [] }));
}

function tagExists(tagCondition: (t: { name: SQL; slug: SQL }) => SQL) {
  const t = { name: sql.raw(`et."name"`), slug: sql.raw(`et."slug"`) };
  return sql`exists (select 1 from "post_tags" ept inner join "tags" et on et."id" = ept."tag_id" where ept."post_id" = ${outerPostId} and ${tagCondition(t)})`;
}

/** 검색/필터/정렬/페이지네이션. 접근 가능한 글만 반환한다. */
export async function searchPosts(
  viewer: Viewer | null,
  params: Partial<SearchParams> & { authorId?: string; pageSize?: number; visibility?: "public" | "private" },
): Promise<{ items: PostSummary[]; total: number; page: number; pageCount: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const conditions: SQL[] = [];

  if (params.scope === "mine") {
    // 내 글: 공개/비공개/숨김 모두 (작성자 본인만)
    if (!viewer) return { items: [], total: 0, page, pageCount: 0 };
    conditions.push(eq(posts.authorId, viewer.id));
  } else {
    conditions.push(publicCondition);
  }
  if (params.authorId) conditions.push(eq(posts.authorId, params.authorId));
  if (params.visibility) conditions.push(eq(posts.visibility, params.visibility));

  const q = params.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    const byTitle = ilike(posts.title, pattern);
    const byAuthor = ilike(users.name, pattern);
    const byTag = tagExists((t) => sql`(${t.name} ilike ${pattern} or ${t.slug} ilike ${pattern})`);
    const field = params.field ?? "all";
    conditions.push(
      field === "title" ? byTitle : field === "author" ? byAuthor : field === "tag" ? byTag : or(byTitle, byAuthor, byTag)!,
    );
  }
  const tagFilter = params.tag;
  if (tagFilter) conditions.push(tagExists((t) => sql`${t.slug} = ${tagFilter}`));

  const where = and(...conditions);
  const orderBy =
    params.sort === "popular"
      ? [desc(popularityScoreSql), desc(posts.publishedAt), desc(posts.createdAt)]
      : [desc(sql`coalesce(${posts.publishedAt}, ${posts.createdAt})`), desc(posts.createdAt)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(summaryColumns)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(where),
  ]);

  return { items: await attachTags(rows), total, page, pageCount: Math.ceil(total / pageSize) };
}

export async function listPopularTags(limit = 12) {
  return db
    .select({ name: tags.name, slug: tags.slug, postCount: count(posts.id) })
    .from(tags)
    .innerJoin(postTags, eq(postTags.tagId, tags.id))
    .innerJoin(posts, and(eq(posts.id, postTags.postId), publicCondition))
    .groupBy(tags.id)
    .orderBy(desc(count(posts.id)), asc(tags.name))
    .limit(limit);
}

export interface PostDetail extends PostSummary {
  content: string;
  contentText: string;
  html: string;
  sourceFormat: "docx" | "markdown";
}

async function loadPost(postId: string) {
  const [row] = await db
    .select({ ...summaryColumns, content: posts.content, contentText: posts.contentText, sourceFormat: posts.sourceFormat })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId))
    .limit(1);
  return row ?? null;
}

/** 열람 권한이 없으면 존재 여부도 숨기기 위해 null 을 반환한다. */
export async function getPostForViewer(viewer: Viewer | null, postId: string): Promise<PostDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return null;
  const row = await loadPost(postId);
  if (!row || !canViewPost(viewer, row)) return null;
  const [withTags] = await attachTags([row]);
  return { ...withTags, html: renderMarkdown(row.content).html };
}

export async function getPostForEdit(viewer: Viewer, postId: string): Promise<PostDetail> {
  const post = await getPostForViewer(viewer, postId);
  if (!post) throw notFound("글을 찾을 수 없습니다.");
  if (!canEditPost(viewer, post)) throw forbidden("본인이 작성한 글만 수정할 수 있습니다.");
  return post;
}

export async function listRelatedPosts(post: PostDetail, limit = 3): Promise<PostSummary[]> {
  const slugs = post.tags.map((t) => t.slug);
  const sameTag = slugs.length
    ? tagExists(
        (t) =>
          sql`${t.slug} in (${sql.join(
            slugs.map((s) => sql`${s}`),
            sql`, `,
          )})`,
      )
    : sql`false`;
  const rows = await db
    .select(summaryColumns)
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(publicCondition, sql`${posts.id} <> ${post.id}`))
    .orderBy(desc(sql`case when ${sameTag} then 1 else 0 end`), desc(posts.publishedAt))
    .limit(limit);
  return attachTags(rows);
}

function parseInput(input: PostInput) {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "입력값을 확인해 주세요.", fieldErrorsOf(parsed.error));
  const rendered = renderMarkdown(parsed.data.content);
  if (!rendered.text.trim()) throw new AppError("VALIDATION", "본문이 비어 있습니다.", { content: "본문이 비어 있습니다." });
  return { ...parsed.data, tags: normalizeTags(parsed.data.tags), contentText: rendered.text, excerpt: makeExcerpt(rendered.text) };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function replaceTags(tx: Tx, postId: string, tagList: { name: string; slug: string }[]) {
  await tx.delete(postTags).where(eq(postTags.postId, postId));
  if (tagList.length === 0) return;
  await tx.insert(tags).values(tagList).onConflictDoNothing({ target: tags.slug });
  const tagRows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(
      inArray(
        tags.slug,
        tagList.map((t) => t.slug),
      ),
    );
  await tx.insert(postTags).values(tagRows.map((t) => ({ postId, tagId: t.id })));
}

export async function createPost(viewer: Viewer, input: PostInput): Promise<{ id: string }> {
  if (!isActive(viewer)) throw forbidden();
  const data = parseInput(input);
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(posts)
      .values({
        authorId: viewer.id,
        title: data.title,
        content: data.content,
        contentText: data.contentText,
        excerpt: data.excerpt,
        sourceFormat: data.sourceFormat,
        visibility: data.visibility,
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: posts.id });
    await replaceTags(tx, created.id, data.tags);
    return created;
  });
}

export async function updatePost(viewer: Viewer, postId: string, input: PostInput): Promise<{ id: string }> {
  const existing = await loadPost(postId);
  if (!existing || !canViewPost(viewer, existing)) throw notFound("글을 찾을 수 없습니다.");
  if (!canEditPost(viewer, existing)) throw forbidden("본인이 작성한 글만 수정할 수 있습니다.");
  const data = parseInput(input);
  await db.transaction(async (tx) => {
    await tx
      .update(posts)
      .set({
        title: data.title,
        content: data.content,
        contentText: data.contentText,
        excerpt: data.excerpt,
        sourceFormat: data.sourceFormat,
        visibility: data.visibility,
        publishedAt: existing.publishedAt ?? new Date(),
      })
      .where(eq(posts.id, postId));
    await replaceTags(tx, postId, data.tags);
  });
  return { id: postId };
}

export async function deletePost(viewer: Viewer, postId: string): Promise<void> {
  const [existing] = await db
    .select({ authorId: posts.authorId, visibility: posts.visibility, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!existing) throw notFound("글을 찾을 수 없습니다.");
  if (!canDeletePost(viewer, existing)) throw forbidden("이 글을 삭제할 권한이 없습니다.");
  // 댓글/하이라이트/알림/신고는 FK ON DELETE CASCADE 로 함께 삭제된다.
  await db.delete(posts).where(eq(posts.id, postId));
}

/** 관리자: 글 숨김/복구 */
export async function setPostHidden(viewer: Viewer, postId: string, hidden: boolean): Promise<void> {
  if (!isAdmin(viewer)) throw forbidden("관리자만 사용할 수 있습니다.");
  const result = await db
    .update(posts)
    .set({ status: hidden ? "hidden" : "published" })
    .where(eq(posts.id, postId))
    .returning({ id: posts.id });
  if (result.length === 0) throw notFound("글을 찾을 수 없습니다.");
}

/** 관리자: 전체 글 목록 (비공개 글은 메타데이터만, 본문은 제공하지 않음) */
export async function listAllPostsForAdmin(viewer: Viewer, page = 1, pageSize = 20) {
  if (!isAdmin(viewer)) throw forbidden("관리자만 사용할 수 있습니다.");
  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        authorName: users.name,
        visibility: posts.visibility,
        status: posts.status,
        createdAt: posts.createdAt,
        commentCount: commentCountSql,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(posts),
  ]);
  return { items, total, page, pageCount: Math.ceil(total / pageSize) };
}

export async function getAuthorStats(userId: string) {
  const [row] = await db
    .select({
      postCount: count(posts.id),
      publicCount: sql<number>`count(*) filter (where ${posts.visibility} = 'public' and ${posts.status} = 'published')::int`,
      privateCount: sql<number>`count(*) filter (where ${posts.visibility} = 'private')::int`,
    })
    .from(posts)
    .where(eq(posts.authorId, userId));
  return row;
}
