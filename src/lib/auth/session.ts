import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";
import { unauthenticated } from "@/lib/errors";
import { isAdmin, isActive, type Viewer } from "@/lib/permissions";

/** 요청 단위로 캐시되는 현재 사용자. 비로그인 또는 정지 사용자는 null 이 아니라 banned 로 구분한다. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "admin" ? "admin" : "user",
    banned: !!u.banned,
  };
});

/** 서버 액션/라우트 핸들러용: 로그인 + 활성 사용자 강제 */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!isActive(viewer)) throw unauthenticated();
  return viewer;
}

/** 페이지용: 로그인하지 않았으면 로그인 페이지로 이동 */
export async function requireViewerOrRedirect(nextPath: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!isActive(viewer)) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return viewer;
}

export async function requireAdminOrNull(): Promise<Viewer | null> {
  const viewer = await getViewer();
  return isAdmin(viewer) ? viewer : null;
}
