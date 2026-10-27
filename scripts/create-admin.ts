/**
 * 초기 관리자 계정 생성.
 *   npm run admin:create                       (.env.local 의 ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME 사용)
 *   npm run admin:create -- you@x.com 'pw' 이름   (인자로 지정)
 * 이미 존재하는 이메일이면 관리자 권한만 부여한다.
 */
import "./env";
import { eq } from "drizzle-orm";

async function main() {
  const [argEmail, argPassword, argName] = process.argv.slice(2);
  const email = (argEmail ?? process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const password = argPassword ?? process.env.ADMIN_PASSWORD ?? "";
  const name = argName ?? process.env.ADMIN_NAME ?? "관리자";
  if (!email || password.length < 8) {
    console.error("ADMIN_EMAIL 과 8자 이상의 ADMIN_PASSWORD 가 필요합니다.");
    process.exit(1);
  }

  const { auth } = await import("@/lib/auth/auth");
  const { db, pool } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    await db.update(users).set({ role: "admin", banned: false }).where(eq(users.id, existing.id));
    console.log(`✓ 기존 계정 ${email} 에 관리자 권한을 부여했습니다.`);
  } else {
    // headers 없이 서버에서 호출하면 Better Auth 가 신뢰된 서버 호출로 처리한다.
    await auth.api.createUser({ body: { email, password, name, role: "admin" } });
    console.log(`✓ 관리자 계정 ${email} 을(를) 만들었습니다.`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error("관리자 생성 실패:", err);
  process.exit(1);
});
