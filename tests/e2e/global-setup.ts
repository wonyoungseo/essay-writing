import { execSync } from "node:child_process";
import { config } from "dotenv";
import { runMigrations } from "../../scripts/migrate";

export default async function globalSetup() {
  config({ path: [".env.local", ".env"], quiet: true });
  const url = process.env.DATABASE_URL_TEST;
  if (!url || url === process.env.DATABASE_URL) throw new Error("DATABASE_URL_TEST 가 필요하며 개발 DB 와 달라야 합니다.");
  await runMigrations(url);
  execSync("npx tsx --conditions=react-server --tsconfig tsconfig.json tests/e2e/seed.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
