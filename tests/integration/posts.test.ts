import { beforeEach, describe, expect, it } from "vitest";
import {
  deletePost,
  getPostForEdit,
  getPostForViewer,
  listAllPostsForAdmin,
  listPopularTags,
  listRelatedPosts,
  searchPosts,
  setPostHidden,
  updatePost,
} from "@/features/posts/service";
import { createComment } from "@/features/comments/service";
import type { Viewer } from "@/lib/permissions";
import type { PostInput } from "@/lib/validation";
import { expectAppError, makePost, makeUser, resetDb, SAMPLE_BODY } from "./helpers";

let author: Viewer;
let reader: Viewer;
let admin: Viewer;

beforeEach(async () => {
  await resetDb();
  author = await makeUser("Author");
  reader = await makeUser("Reader");
  admin = await makeUser("Admin", "admin");
});

describe("게시글 생성 및 조회", () => {
  it("생성한 글을 상세 조회할 수 있고 본문은 안전한 HTML 로 렌더링된다", async () => {
    const { id } = await makePost(author, { content: `${SAMPLE_BODY}\n\n<script>alert(1)</script>`, tags: ["일상", "#기록"] });
    const post = await getPostForViewer(null, id);
    expect(post?.title).toBe("테스트 에세이");
    expect(post?.authorName).toBe("Author");
    expect(post?.html).toContain("<strong>강조된 문장</strong>");
    expect(post?.html).not.toContain("<script");
    expect(post?.tags.map((t) => t.slug).sort()).toEqual(["기록", "일상"]);
    expect(post?.contentText).toContain("첫 번째 문단입니다.");
    expect(post?.excerpt.length).toBeGreaterThan(0);
  });

  it("잘못된 입력은 VALIDATION 오류", async () => {
    await expectAppError(makePost(author, { title: "" }), "VALIDATION");
    await expectAppError(makePost(author, { content: "<div></div>" }), "VALIDATION");
  });

  it("존재하지 않거나 형식이 틀린 ID 는 null", async () => {
    expect(await getPostForViewer(null, "not-a-uuid")).toBeNull();
    expect(await getPostForViewer(null, crypto.randomUUID())).toBeNull();
  });
});

describe("비공개 글 접근 제어", () => {
  it("비공개 글은 작성자만 조회할 수 있다", async () => {
    const { id } = await makePost(author, { visibility: "private" });
    expect(await getPostForViewer(author, id)).not.toBeNull();
    expect(await getPostForViewer(reader, id)).toBeNull();
    expect(await getPostForViewer(admin, id)).toBeNull();
    expect(await getPostForViewer(null, id)).toBeNull();
  });

  it("비공개 글은 검색 결과와 태그 집계에 나오지 않는다", async () => {
    await makePost(author, { title: "비밀 일기", visibility: "private", tags: ["비밀"] });
    await makePost(author, { title: "공개 일기", tags: ["공개"] });
    const res = await searchPosts(reader, { q: "일기" });
    expect(res.items.map((p) => p.title)).toEqual(["공개 일기"]);
    expect((await listPopularTags()).map((t) => t.slug)).toEqual(["공개"]);
    // 작성자 본인의 '내 글' 범위에는 포함
    const mine = await searchPosts(author, { scope: "mine" });
    expect(mine.total).toBe(2);
    expect((await searchPosts(reader, { scope: "mine" })).total).toBe(0);
    expect((await searchPosts(null, { scope: "mine" })).total).toBe(0);
  });
});

describe("수정 및 삭제 권한", () => {
  it("작성자는 수정할 수 있고 태그가 교체된다", async () => {
    const { id } = await makePost(author, { tags: ["일상"] });
    await updatePost(author, id, { title: "고친 제목", content: "고친 본문", tags: ["여행"], visibility: "public", sourceFormat: "markdown" });
    const post = await getPostForViewer(null, id);
    expect(post?.title).toBe("고친 제목");
    expect(post?.contentText).toBe("고친 본문");
    expect(post?.tags.map((t) => t.slug)).toEqual(["여행"]);
  });

  it("다른 사용자와 관리자는 글을 수정할 수 없다", async () => {
    const { id } = await makePost(author);
    const input: PostInput = { title: "해킹", content: "x", tags: [], visibility: "public", sourceFormat: "markdown" };
    await expectAppError(updatePost(reader, id, input), "FORBIDDEN");
    await expectAppError(updatePost(admin, id, input), "FORBIDDEN");
    await expectAppError(getPostForEdit(reader, id), "FORBIDDEN");
    expect((await getPostForViewer(null, id))?.title).toBe("테스트 에세이");
  });

  it("타인의 비공개 글은 수정 시 존재 자체를 숨긴다 (NOT_FOUND)", async () => {
    const { id } = await makePost(author, { visibility: "private" });
    await expectAppError(updatePost(reader, id, { title: "x", content: "x", tags: [], visibility: "public", sourceFormat: "markdown" }), "NOT_FOUND");
  });

  it("삭제는 작성자 또는 관리자만 가능하고 관련 데이터도 함께 지워진다", async () => {
    const { id } = await makePost(author);
    await createComment(reader, { postId: id, content: "좋은 글" });
    await expectAppError(deletePost(reader, id), "FORBIDDEN");
    await deletePost(admin, id);
    expect(await getPostForViewer(author, id)).toBeNull();
    await expectAppError(deletePost(author, id), "NOT_FOUND");
  });

  it("관리자가 숨긴 글은 공개 목록에서 빠지고 작성자에게만 보인다", async () => {
    const { id } = await makePost(author);
    await expectAppError(setPostHidden(reader, id, true), "FORBIDDEN");
    await setPostHidden(admin, id, true);
    expect(await getPostForViewer(reader, id)).toBeNull();
    expect((await getPostForViewer(author, id))?.status).toBe("hidden");
    expect((await searchPosts(null, {})).total).toBe(0);
    await setPostHidden(admin, id, false);
    expect((await searchPosts(null, {})).total).toBe(1);
  });

  it("관리자 목록은 관리자만 볼 수 있다", async () => {
    await makePost(author, { visibility: "private" });
    await expectAppError(listAllPostsForAdmin(reader), "FORBIDDEN");
    const res = await listAllPostsForAdmin(admin);
    expect(res.total).toBe(1);
    expect(res.items[0]).not.toHaveProperty("content");
  });
});

describe("검색 및 필터링", () => {
  beforeEach(async () => {
    await makePost(author, { title: "겨울 바다", tags: ["여행"] });
    await makePost(reader, { title: "봄의 정원", tags: ["일상", "계절"] });
    await makePost(author, { title: "100% 진심", tags: ["생각"] });
  });

  it("제목으로 검색한다", async () => {
    const res = await searchPosts(null, { q: "바다", field: "title" });
    expect(res.items.map((p) => p.title)).toEqual(["겨울 바다"]);
  });

  it("작성자 이름으로 검색한다", async () => {
    const res = await searchPosts(null, { q: "reader", field: "author" });
    expect(res.items.map((p) => p.title)).toEqual(["봄의 정원"]);
  });

  it("태그 검색어와 태그 필터를 지원하고 조합할 수 있다", async () => {
    expect((await searchPosts(null, { q: "계절", field: "tag" })).items.map((p) => p.title)).toEqual(["봄의 정원"]);
    expect((await searchPosts(null, { tag: "여행" })).items.map((p) => p.title)).toEqual(["겨울 바다"]);
    expect((await searchPosts(null, { tag: "여행", q: "정원" })).total).toBe(0);
  });

  it("전체 범위 검색은 제목/작성자/태그 중 하나라도 맞으면 찾는다", async () => {
    expect((await searchPosts(null, { q: "author" })).total).toBe(2);
  });

  it("LIKE 와일드카드는 문자 그대로 검색한다", async () => {
    expect((await searchPosts(null, { q: "%" })).items.map((p) => p.title)).toEqual(["100% 진심"]);
    expect((await searchPosts(null, { q: "_" })).total).toBe(0);
  });

  it("SQL 처럼 보이는 검색어도 안전하게 처리한다", async () => {
    const res = await searchPosts(null, { q: "'; drop table posts; --" });
    expect(res.total).toBe(0);
    expect((await searchPosts(null, {})).total).toBe(3);
  });

  it("인기순은 댓글 수 기준으로 정렬한다", async () => {
    const all = await searchPosts(null, {});
    const spring = all.items.find((p) => p.title === "봄의 정원")!;
    await createComment(author, { postId: spring.id, content: "좋아요" });
    await createComment(admin, { postId: spring.id, content: "저도요" });
    const res = await searchPosts(null, { sort: "popular" });
    expect(res.items[0].title).toBe("봄의 정원");
    expect(res.items[0].commentCount).toBe(2);
  });

  it("관련 글은 같은 태그의 글을 먼저 보여 준다", async () => {
    const all = await searchPosts(null, {});
    const sea = all.items.find((p) => p.title === "겨울 바다")!;
    const another = await makePost(reader, { title: "여름 바다", tags: ["여행"] });
    const detail = await getPostForViewer(null, sea.id);
    const related = await listRelatedPosts(detail!);
    expect(related[0].id).toBe(another.id);
    expect(related.map((p) => p.id)).not.toContain(sea.id);
  });

  it("관리자 목록의 댓글 수가 정확하다", async () => {
    const all = await searchPosts(null, {});
    await createComment(reader, { postId: all.items[0].id, content: "a" });
    const res = await listAllPostsForAdmin(admin);
    expect(res.items.map((p) => p.commentCount).sort()).toEqual([0, 0, 1]);
  });

  it("페이지네이션", async () => {
    const p1 = await searchPosts(null, { page: 1, pageSize: 2 });
    const p2 = await searchPosts(null, { page: 2, pageSize: 2 });
    expect(p1.items).toHaveLength(2);
    expect(p2.items).toHaveLength(1);
    expect(p1.pageCount).toBe(2);
    expect(new Set([...p1.items, ...p2.items].map((p) => p.id)).size).toBe(3);
  });
});
