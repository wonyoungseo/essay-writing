/** E2E 전용: 테스트 DB 초기화 + 계정 생성. playwright global-setup 에서 실행된다. */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { makeDocx } from "../fixtures/make-docx";

async function main() {
  const { auth } = await import("@/lib/auth/auth");
  const { db, pool } = await import("@/lib/db");
  await db.execute(
    sql`truncate table reports, notifications, highlights, comments, post_tags, tags, posts, sessions, accounts, verifications, users restart identity cascade`,
  );
  const accounts = [
    { email: "e2e-writer@test.local", name: "글쓴이", role: "user" as const },
    { email: "e2e-reader@test.local", name: "읽는이", role: "user" as const },
    { email: "e2e-admin@test.local", name: "운영자", role: "admin" as const },
  ];
  for (const a of accounts) {
    await auth.api.createUser({ body: { ...a, password: "e2e-password-1234" } });
  }
  // Word 업로드 테스트용 실제 .docx 파일
  const docx = await makeDocx([
    { text: "겨울 일기", style: "Title" },
    { text: "눈이 내리는 밤에는 소리가 사라진다." },
    { text: "두 번째 장", style: "Heading2" },
  ]);
  writeFileSync(path.join(import.meta.dirname, "files/winter.docx"), docx);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
