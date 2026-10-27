import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import { accounts, sessions, users, verifications } from "@/lib/db/schema";

/** Vercel 이 배포마다 넣어 주는 주소들. 별도 도메인을 쓰면 BETTER_AUTH_URL 로 지정한다. */
const vercelOrigins = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]
  .filter((host): host is string => !!host)
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  appName: "에세이 글쓰기",
  baseURL: process.env.BETTER_AUTH_URL ?? vercelOrigins[0],
  trustedOrigins: vercelOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  emailAndPassword: {
    enabled: true,
    // 공개 회원가입 금지: 계정은 관리자만 생성한다 (docs/decisions.md D-02)
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    // DISABLE_RATE_LIMIT 은 E2E 테스트 전용. 운영 환경에서는 설정하지 않는다.
    enabled: process.env.NODE_ENV === "production" && process.env.DISABLE_RATE_LIMIT !== "1",
    window: 60,
    max: 30,
  },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] }), nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
