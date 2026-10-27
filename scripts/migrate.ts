import "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function runMigrations(connectionString: string) {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.endsWith("migrate.ts");
// Vercel 미리보기(preview) 빌드는 운영 DB 를 바꾸지 않도록 마이그레이션을 건너뛴다.
const skipOnVercelPreview = !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production";
if (isDirectRun && skipOnVercelPreview) {
  console.log(`- Vercel ${process.env.VERCEL_ENV} 빌드: 마이그레이션 건너뜀`);
} else if (isDirectRun) {
  // 마이그레이션은 커넥션 풀러를 거치지 않는 직접 연결(unpooled)이 안전하다.
  const url = process.argv.includes("--test")
    ? process.env.DATABASE_URL_TEST
    : (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL);
  if (!url) {
    console.error("DATABASE_URL(또는 --test 시 DATABASE_URL_TEST)이 필요합니다.");
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.log("✓ 마이그레이션 완료"))
    .catch((err) => {
      console.error("마이그레이션 실패:", err);
      process.exit(1);
    });
}
