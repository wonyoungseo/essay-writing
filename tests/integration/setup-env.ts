import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
if (!process.env.DATABASE_URL_TEST) throw new Error("DATABASE_URL_TEST 가 필요합니다 (.env.example 참고).");
// 서비스 코드가 사용하는 DATABASE_URL 을 테스트 DB 로 바꾼다. (개발 DB 를 건드리지 않음)
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.DISABLE_RATE_LIMIT = "1";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-123";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
