import { count, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { isAdmin, isActive, type Viewer } from "@/lib/permissions";
import { createUserSchema, fieldErrorsOf, profileSchema } from "@/lib/validation";

function assertAdmin(viewer: Viewer) {
  if (!isAdmin(viewer)) throw forbidden("관리자만 사용할 수 있습니다.");
}

export async function listUsers(viewer: Viewer) {
  assertAdmin(viewer);
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      createdAt: users.createdAt,
      // 상관 서브쿼리: 바깥 users.id 를 명시적으로 한정 (posts.ts 의 주석 참고)
      postCount: sql<number>`(select count(*)::int from "posts" p where p."author_id" = "users"."id")`,
      commentCount: sql<number>`(select count(*)::int from "comments" c where c."author_id" = "users"."id")`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

/**
 * 관리자가 계정을 생성한다 (공개 회원가입 없음).
 * Better Auth admin 플러그인이 비밀번호 해싱과 계정 연결을 담당한다.
 * headers 를 넘기면 Better Auth 도 관리자 세션을 한 번 더 검증한다.
 */
export async function createUserByAdmin(viewer: Viewer, input: unknown, headers?: Headers) {
  assertAdmin(viewer);
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "입력값을 확인해 주세요.", fieldErrorsOf(parsed.error));
  const email = parsed.data.email.toLowerCase();
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) throw new AppError("CONFLICT", "이미 등록된 이메일입니다.", { email: "이미 등록된 이메일입니다." });
  const result = await auth.api.createUser({
    body: { email, name: parsed.data.name, password: parsed.data.password, role: parsed.data.role },
    headers,
  });
  return { id: result.user.id };
}

async function assertTarget(viewer: Viewer, userId: string) {
  assertAdmin(viewer);
  if (userId === viewer.id) throw new AppError("VALIDATION", "본인 계정의 권한이나 상태는 변경할 수 없습니다.");
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target) throw notFound("사용자를 찾을 수 없습니다.");
}

/** 정지 시 Better Auth 가 해당 사용자의 모든 세션을 폐기한다. */
export async function setUserBanned(viewer: Viewer, userId: string, banned: boolean, headers?: Headers) {
  await assertTarget(viewer, userId);
  if (headers) {
    if (banned) await auth.api.banUser({ body: { userId, banReason: "관리자 조치" }, headers });
    else await auth.api.unbanUser({ body: { userId }, headers });
  } else {
    await db.update(users).set({ banned, banReason: banned ? "관리자 조치" : null }).where(eq(users.id, userId));
  }
}

export async function setUserRole(viewer: Viewer, userId: string, role: "user" | "admin", headers?: Headers) {
  await assertTarget(viewer, userId);
  if (headers) await auth.api.setRole({ body: { userId, role }, headers });
  else await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateProfile(viewer: Viewer, input: unknown) {
  if (!isActive(viewer)) throw forbidden();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "입력값을 확인해 주세요.", fieldErrorsOf(parsed.error));
  await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, viewer.id));
}

export async function countUsers() {
  const [row] = await db.select({ n: count() }).from(users);
  return row.n;
}
