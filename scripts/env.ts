import { config } from "dotenv";

// 스크립트 실행 시 Next.js 와 같은 순서로 환경 변수를 읽는다.
config({ path: [".env.local", ".env"], quiet: true });
