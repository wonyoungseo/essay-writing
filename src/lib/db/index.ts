import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 환경 변수가 설정되지 않았습니다. .env.example 을 참고하세요.");
  }
  // Vercel(서버리스)에서는 인스턴스가 여러 개 뜰 수 있으므로 인스턴스당 연결을 적게 유지한다.
  // 운영 DATABASE_URL 은 Neon 의 pooled(커넥션 풀러) 주소를 사용한다.
  const serverless = !!process.env.VERCEL;
  return new Pool({ connectionString, max: serverless ? 3 : 10, idleTimeoutMillis: serverless ? 5_000 : 10_000 });
}

// 개발 서버의 HMR 로 인해 커넥션 풀이 중복 생성되지 않도록 전역에 보관한다.
const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema, casing: undefined });
export type Db = typeof db;
export { pool };
