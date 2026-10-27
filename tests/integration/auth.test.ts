import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createUserByAdmin, listUsers, setUserBanned, setUserRole, updateProfile } from "@/features/users/service";
import type { Viewer } from "@/lib/permissions";
import { createComment } from "@/features/comments/service";
import { expectAppError, makePost, makeUser, resetDb } from "./helpers";

let admin: Viewer;
let user: Viewer;

beforeEach(async () => {
  await resetDb();
  admin = await makeUser("Admin", "admin");
  user = await makeUser("User");
});

describe("회원 정책", () => {
  it("공개 회원가입 API 는 비활성화되어 있다", async () => {
    await expect(auth.api.signUpEmail({ body: { email: "new@test.local", password: "password-1234", name: "가입자" } })).rejects.toThrow();
    const rows = await db.select().from(users).where(eq(users.email, "new@test.local"));
    expect(rows).toHaveLength(0);
  });

  it("HTTP 로 회원가입을 시도해도 거부된다", async () => {
    const res = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "http@test.local", password: "password-1234", name: "x" }),
      }),
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.select().from(users).where(eq(users.email, "http@test.local"))).toHaveLength(0);
  });

  it("관리자가 만든 계정으로 로그인할 수 있다", async () => {
    await createUserByAdmin(admin, { email: "Invited@Test.local", name: "초대", password: "invited-pass-1", role: "user" });
    const res = await auth.api.signInEmail({ body: { email: "invited@test.local", password: "invited-pass-1" } });
    expect(res.user.email).toBe("invited@test.local");
    await expect(auth.api.signInEmail({ body: { email: "invited@test.local", password: "wrong-password" } })).rejects.toThrow();
  });

  it("일반 사용자는 계정을 만들거나 관리할 수 없다", async () => {
    await expectAppError(createUserByAdmin(user, { email: "x@test.local", name: "x", password: "password-1234" }), "FORBIDDEN");
    await expectAppError(listUsers(user), "FORBIDDEN");
    await expectAppError(setUserBanned(user, admin.id, true), "FORBIDDEN");
    await expectAppError(setUserRole(user, user.id, "admin"), "FORBIDDEN");
  });

  it("관리자는 사용자 목록과 활동 수를 볼 수 있다", async () => {
    const { id } = await makePost(user);
    await createComment(admin, { postId: id, content: "관리자 댓글" });
    const list = await listUsers(admin);
    expect(list.find((u) => u.id === user.id)).toMatchObject({ postCount: 1, commentCount: 0 });
    expect(list.find((u) => u.id === admin.id)).toMatchObject({ postCount: 0, commentCount: 1 });
  });

  it("관리자 계정 생성 입력값과 중복 이메일을 검증한다", async () => {
    await expectAppError(createUserByAdmin(admin, { email: "bad", name: "x", password: "short" }), "VALIDATION");
    await expectAppError(createUserByAdmin(admin, { email: user.email, name: "x", password: "password-1234" }), "CONFLICT");
  });

  it("관리자는 다른 사용자를 정지/권한 변경할 수 있지만 본인은 변경할 수 없다", async () => {
    await setUserBanned(admin, user.id, true);
    await setUserRole(admin, user.id, "admin");
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row.banned).toBe(true);
    expect(row.role).toBe("admin");
    await expectAppError(setUserBanned(admin, admin.id, true), "VALIDATION");
  });

  it("정지된 사용자는 로그인할 수 없다", async () => {
    const { id } = await createUserByAdmin(admin, { email: "ban@test.local", name: "정지", password: "ban-pass-1234" });
    await setUserBanned(admin, id, true);
    await expect(auth.api.signInEmail({ body: { email: "ban@test.local", password: "ban-pass-1234" } })).rejects.toThrow();
  });

  it("프로필 이름은 본인만 바꾼다", async () => {
    await updateProfile(user, { name: "새 이름" });
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row.name).toBe("새 이름");
    await expectAppError(updateProfile(user, { name: "" }), "VALIDATION");
  });
});
