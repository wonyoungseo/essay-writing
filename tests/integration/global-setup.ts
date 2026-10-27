import { config } from "dotenv";
import { runMigrations } from "../../scripts/migrate";

export default async function setup() {
  config({ path: [".env.local", ".env"], quiet: true });
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST 가 필요합니다.");
  if (url === process.env.DATABASE_URL) throw new Error("테스트 DB 와 개발 DB 가 같습니다. 데이터 손상을 막기 위해 중단합니다.");
  await runMigrations(url);
}
