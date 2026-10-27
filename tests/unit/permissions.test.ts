import { describe, expect, it } from "vitest";
import {
  canDeleteComment,
  canDeletePost,
  canEditComment,
  canEditPost,
  canInteractWithPost,
  canViewPost,
  isAdmin,
  type Viewer,
} from "@/lib/permissions";

const author: Viewer = { id: "a", name: "작가", email: "a@x", role: "user", banned: false };
const other: Viewer = { id: "b", name: "독자", email: "b@x", role: "user", banned: false };
const admin: Viewer = { id: "c", name: "관리자", email: "c@x", role: "admin", banned: false };
const bannedAuthor: Viewer = { ...author, banned: true };

const publicPost = { authorId: "a", visibility: "public", status: "published" } as const;
const privatePost = { authorId: "a", visibility: "private", status: "published" } as const;
const hiddenPost = { authorId: "a", visibility: "public", status: "hidden" } as const;

describe("canViewPost", () => {
  it("공개 글은 비로그인 사용자도 볼 수 있다", () => {
    expect(canViewPost(null, publicPost)).toBe(true);
  });
  it("비공개 글은 작성자만 볼 수 있다 (관리자 포함 타인 불가)", () => {
    expect(canViewPost(author, privatePost)).toBe(true);
    expect(canViewPost(other, privatePost)).toBe(false);
    expect(canViewPost(admin, privatePost)).toBe(false);
    expect(canViewPost(null, privatePost)).toBe(false);
  });
  it("숨김 글은 작성자만 볼 수 있다", () => {
    expect(canViewPost(author, hiddenPost)).toBe(true);
    expect(canViewPost(other, hiddenPost)).toBe(false);
  });
});

describe("수정/삭제 권한", () => {
  it("글 수정은 작성자 본인만", () => {
    expect(canEditPost(author, publicPost)).toBe(true);
    expect(canEditPost(other, publicPost)).toBe(false);
    expect(canEditPost(admin, publicPost)).toBe(false);
    expect(canEditPost(null, publicPost)).toBe(false);
  });
  it("정지된 사용자는 자기 글도 수정할 수 없다", () => {
    expect(canEditPost(bannedAuthor, publicPost)).toBe(false);
  });
  it("글 삭제는 작성자 또는 관리자", () => {
    expect(canDeletePost(author, publicPost)).toBe(true);
    expect(canDeletePost(admin, publicPost)).toBe(true);
    expect(canDeletePost(other, publicPost)).toBe(false);
  });
  it("댓글 수정은 작성자만, 삭제는 작성자 또는 관리자", () => {
    const comment = { authorId: "b" };
    expect(canEditComment(other, comment)).toBe(true);
    expect(canEditComment(admin, comment)).toBe(false);
    expect(canDeleteComment(admin, comment)).toBe(true);
    expect(canDeleteComment(author, comment)).toBe(false);
  });
  it("정지된 관리자는 관리자 권한이 없다", () => {
    expect(isAdmin({ ...admin, banned: true })).toBe(false);
  });
});

describe("canInteractWithPost", () => {
  it("로그인 사용자는 공개 글에 참여할 수 있다", () => {
    expect(canInteractWithPost(other, publicPost)).toBe(true);
    expect(canInteractWithPost(null, publicPost)).toBe(false);
  });
  it("타인의 비공개 글, 숨김 글에는 참여할 수 없다", () => {
    expect(canInteractWithPost(other, privatePost)).toBe(false);
    expect(canInteractWithPost(author, hiddenPost)).toBe(false);
  });
});
