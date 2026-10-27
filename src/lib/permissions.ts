/**
 * 권한 판정 로직. 순수 함수로 유지해 단위 테스트하고,
 * 모든 서비스 함수(서버)에서 이 함수를 통해 권한을 확인한다.
 */

export type Role = "user" | "admin";

export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: Role;
  banned: boolean;
}

export interface PostAccessInfo {
  authorId: string;
  visibility: "public" | "private";
  status: "draft" | "published" | "hidden";
}

export const isAdmin = (viewer: Viewer | null | undefined): boolean =>
  !!viewer && !viewer.banned && viewer.role === "admin";

export const isActive = (viewer: Viewer | null | undefined): viewer is Viewer => !!viewer && !viewer.banned;

export const isPubliclyListed = (post: PostAccessInfo): boolean =>
  post.status === "published" && post.visibility === "public";

/** 공개+게시 상태이면 누구나, 그 외에는 작성자 본인만 열람할 수 있다. */
export function canViewPost(viewer: Viewer | null | undefined, post: PostAccessInfo): boolean {
  if (isPubliclyListed(post)) return true;
  return !!viewer && viewer.id === post.authorId;
}

/** 글 내용 수정은 작성자 본인만 (관리자도 타인의 글 본문은 수정하지 않는다) */
export function canEditPost(viewer: Viewer | null | undefined, post: PostAccessInfo): boolean {
  return isActive(viewer) && viewer.id === post.authorId;
}

/** 삭제는 작성자 본인 또는 관리자 */
export function canDeletePost(viewer: Viewer | null | undefined, post: PostAccessInfo): boolean {
  return canEditPost(viewer, post) || isAdmin(viewer);
}

/** 읽을 수 있는 글에만 댓글/하이라이트를 남길 수 있다. 숨김 글에는 참여 불가. */
export function canInteractWithPost(viewer: Viewer | null | undefined, post: PostAccessInfo): boolean {
  return isActive(viewer) && post.status !== "hidden" && canViewPost(viewer, post);
}

export function canEditComment(viewer: Viewer | null | undefined, comment: { authorId: string }): boolean {
  return isActive(viewer) && viewer.id === comment.authorId;
}

export function canDeleteComment(viewer: Viewer | null | undefined, comment: { authorId: string }): boolean {
  return canEditComment(viewer, comment) || isAdmin(viewer);
}
