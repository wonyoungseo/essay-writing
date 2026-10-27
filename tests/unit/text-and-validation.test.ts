import { describe, expect, it } from "vitest";
import { escapeLike, makeExcerpt, normalizeTags, tagSlug } from "@/lib/text";
import { safeNextPath } from "@/lib/safe-redirect";
import { commentInputSchema, highlightInputSchema, postInputSchema, searchParamsSchema } from "@/lib/validation";

const validPost = { title: "제목", content: "본문", tags: [], visibility: "public", sourceFormat: "markdown" } as const;

describe("postInputSchema", () => {
  it("정상 입력을 통과시킨다", () => {
    expect(postInputSchema.safeParse(validPost).success).toBe(true);
  });
  it("빈 제목과 공백 본문을 거부한다", () => {
    expect(postInputSchema.safeParse({ ...validPost, title: "   " }).success).toBe(false);
    expect(postInputSchema.safeParse({ ...validPost, content: " \n " }).success).toBe(false);
  });
  it("제목 길이, 태그 개수, 공개 범위 값을 검증한다", () => {
    expect(postInputSchema.safeParse({ ...validPost, title: "가".repeat(201) }).success).toBe(false);
    expect(postInputSchema.safeParse({ ...validPost, tags: ["a", "b", "c", "d", "e", "f"] }).success).toBe(false);
    expect(postInputSchema.safeParse({ ...validPost, visibility: "friends" }).success).toBe(false);
  });
});

describe("기타 입력 스키마", () => {
  it("댓글은 1~3000자", () => {
    const postId = crypto.randomUUID();
    expect(commentInputSchema.safeParse({ postId, content: "좋아요" }).success).toBe(true);
    expect(commentInputSchema.safeParse({ postId, content: "  " }).success).toBe(false);
    expect(commentInputSchema.safeParse({ postId, content: "가".repeat(3001) }).success).toBe(false);
  });
  it("하이라이트 범위와 텍스트 길이가 일치해야 한다", () => {
    const base = { postId: crypto.randomUUID(), selectedText: "바람", startOffset: 3, endOffset: 5 };
    expect(highlightInputSchema.safeParse(base).success).toBe(true);
    expect(highlightInputSchema.safeParse({ ...base, endOffset: 9 }).success).toBe(false);
    expect(highlightInputSchema.safeParse({ ...base, startOffset: 5, endOffset: 5 }).success).toBe(false);
    expect(highlightInputSchema.safeParse({ ...base, selectedText: "가".repeat(1001), endOffset: 1004 }).success).toBe(false);
  });
  it("검색 파라미터의 잘못된 값은 기본값으로 대체한다", () => {
    expect(searchParamsSchema.parse({ sort: "hack", page: "-3", field: "x" })).toMatchObject({ sort: "latest", page: 1, field: "all" });
    expect(searchParamsSchema.parse({ sort: "popular", page: "2" })).toMatchObject({ sort: "popular", page: 2 });
  });
});

describe("텍스트 유틸", () => {
  it("LIKE 와일드카드를 이스케이프한다", () => {
    expect(escapeLike("100%_\\")).toBe("100\\%\\_\\\\");
  });
  it("태그를 정규화하고 중복을 제거한다", () => {
    expect(normalizeTags(["#일상", "일상", " Travel Log ", "travel-log", "", "<b>"])).toEqual([
      { name: "일상", slug: "일상" },
      { name: "Travel Log", slug: "travel-log" },
      { name: "<b>", slug: "b" },
    ]);
    expect(tagSlug("!!!")).toBe("");
  });
  it("미리보기 문장은 길이를 제한한다", () => {
    const excerpt = makeExcerpt("가 ".repeat(200), 10);
    expect(excerpt.length).toBeLessThanOrEqual(11);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(makeExcerpt("짧은 글", 10)).toBe("짧은 글");
  });
  it("외부 주소로의 리다이렉트를 막는다", () => {
    expect(safeNextPath("/my")).toBe("/my");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
  });
});
