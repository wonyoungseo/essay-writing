# 에세이 글쓰기

에세이를 파일(Word/Markdown)로 올리고, 읽고, 감상을 남기고, 마음에 드는 문장을 하이라이트로 모으는 웹 플랫폼 MVP.

- **스택**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Drizzle ORM · Better Auth
- **회원 정책**: 공개 회원가입 없음. 관리자가 계정을 발급한다. 공개 글은 로그인 없이 읽기/검색 가능.
- 상세 문서: [요구사항](docs/requirements.md) · [아키텍처](docs/architecture.md) · [ERD](docs/erd.md) · [설계 결정](docs/decisions.md) · [진행 현황/테스트](docs/status.md) · **[배포 가이드](docs/deployment.md)** · **[테마](docs/theming.md)**

## 빠른 시작

필요: Node.js 20.9+ (22 권장), Docker

```bash
npm install                      # .npmrc 의 legacy-peer-deps 설정 사용 (docs/decisions.md D-10)
cp .env.example .env.local       # BETTER_AUTH_SECRET 은 반드시 바꾼다: openssl rand -base64 32
npm run db:up                    # PostgreSQL (localhost:54329, 개발 DB essay + 테스트 DB essay_test)
npm run db:migrate               # 마이그레이션 적용
npm run admin:create             # .env.local 의 ADMIN_EMAIL / ADMIN_PASSWORD 로 관리자 생성
npm run db:seed                  # (선택) 데모 계정·글 생성
npm run dev                      # http://localhost:3000
```

데모 데이터 계정(개발용): `writer@example.com`, `reader@example.com` / 비밀번호 `demo-pass-1234`

## 환경 변수

| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `DATABASE_URL_TEST` | 통합/E2E 테스트 전용 DB. 개발 DB 와 같으면 테스트가 실행을 거부한다 |
| `BETTER_AUTH_SECRET` | 세션 서명 키(32자 이상 임의 문자열). 클라이언트에 노출되지 않는다 |
| `BETTER_AUTH_URL` | 서비스 접속 URL (예: `https://essay.example.com`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `npm run admin:create` 전용. 실행 후 지워도 된다 |
| `DISABLE_RATE_LIMIT` | 테스트 전용. **운영에서 설정하지 말 것** |

클라이언트로 노출되는 `NEXT_PUBLIC_*` 변수는 없다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` / `build` / `start` | 개발 서버 / 프로덕션 빌드 / 프로덕션 실행 |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript 검사 |
| `npm run test:unit` | 단위 테스트 (DB 불필요) |
| `npm run test:integration` | 통합 테스트 (실제 PostgreSQL `essay_test` 사용, 실행 시 마이그레이션 자동 적용) |
| `npm test` | 단위 + 통합 |
| `npm run build && npm run test:e2e` | Playwright E2E (최초 1회 `npx playwright install chromium`). 프로덕션 빌드를 테스트 DB 에 붙여 포트 3100 에서 실행 |
| `npm run db:generate` | 스키마 변경 후 마이그레이션 SQL 생성 (`drizzle/`) |
| `npm run db:migrate` | 마이그레이션 적용 (`-- --test` 로 테스트 DB) |
| `npm run admin:create -- email 'password' 이름` | 관리자 생성(또는 기존 계정을 관리자로 승격) |

## 초기 관리자 설정 / 계정 발급

1. `.env.local` 에 `ADMIN_EMAIL`, `ADMIN_PASSWORD`(8자 이상) 설정 후 `npm run admin:create`
2. 관리자로 로그인 → 우측 메뉴 **관리자** → **계정 발급**에서 이메일·이름·초기 비밀번호로 사용자 생성
3. 초기 비밀번호는 안전한 경로로 전달하고, 사용자는 **설정 → 비밀번호 변경**으로 바꾼다

## 배포

처음 배포하는 분을 위한 단계별 안내는 [docs/deployment.md](docs/deployment.md) 에 있습니다. 요약하면: GitHub 비공개 저장소 → Railway(앱 + PostgreSQL) → 환경 변수 설정 → 배포 시 `npm run db:migrate` 자동 실행 → `npm run admin:create` 로 첫 관리자 생성.
헬스 체크 주소: `/api/health`

## 디렉터리 구조

```text
src/
  app/                 라우트 (페이지, API 라우트)
  components/          UI (layout, posts, feedback, highlights, search, admin, ui)
  features/<domain>/   service.ts(DB 접근 + 서버 권한 검증), actions.ts(서버 액션), 도메인 로직
  lib/                 db(스키마/클라이언트), auth, content(파일 파싱/Markdown), validation, permissions, security
drizzle/               마이그레이션 SQL
scripts/               migrate, create-admin, seed
tests/unit|integration|e2e
docs/
```
