# 배포 가이드

이 문서는 웹 서비스 배포를 처음 해 보는 분을 기준으로 씁니다. 사용자 5~10명, 개발자 2~3명 규모를 가정합니다.

## 0. 큰 그림: 배포에 필요한 것 4가지

| 필요한 것 | 무엇인가 | 이 프로젝트에서 |
|---|---|---|
| **코드 저장소** | 코드를 함께 관리하는 곳 | GitHub (비공개 저장소) |
| **앱 서버** | Next.js 앱이 24시간 실행되는 컴퓨터 | 클라우드 플랫폼(Railway 등)이 대신 운영 |
| **데이터베이스** | 글, 댓글, 계정이 저장되는 PostgreSQL | 같은 플랫폼의 관리형 PostgreSQL |
| **주소(도메인)** | `essay.example.com` 같은 접속 주소 | 처음엔 플랫폼이 주는 무료 주소, 필요하면 회사/개인 도메인 연결 |

배포 흐름은 이렇습니다.

```text
개발자 PC ──git push──▶ GitHub ──자동 감지──▶ 배포 플랫폼
                         │                     ├─ npm ci && npm run build   (빌드)
                         └─ CI: 테스트 실행     ├─ npm run db:migrate        (DB 구조 갱신)
                                                └─ npm run start             (서비스 시작)
                                                        │
사용자 브라우저 ──https://주소──────────────────────────┘
```

코드를 GitHub 의 `main` 브랜치에 합치면, 플랫폼이 자동으로 새 버전을 빌드하고 교체합니다. 서버에 직접 접속할 일이 거의 없습니다.

## 1. 어디에 배포할까 (추천)

| 선택지 | 장점 | 주의할 점 | 적합한 경우 |
|---|---|---|---|
| **A. Railway (추천)** | 앱과 DB 를 한 화면에서 관리. 현재 코드를 고치지 않고 그대로 실행됨. GitHub 연동 자동 배포 | 사용량 기반 유료 (소규모는 월 수 달러 수준이지만 가입 시 요금표 확인) | 서버 운영 경험이 없고, 관리 포인트를 최소화하고 싶을 때 |
| B. Vercel + Neon(DB) | Next.js 를 만든 회사의 호스팅. PR 마다 미리보기 주소가 자동 생성되어 협업에 좋음. 무료 플랜으로 시작 가능 | 서비스 2곳을 관리해야 함. 요청 본문이 약 4.5MB 로 제한되어 **업로드 최대 크기(현재 5MB)를 4MB 로 낮춰야 함**. 메모리 기반 요청 제한이 인스턴스마다 따로 동작 | 무료로 시작하고 싶고 PR 미리보기가 중요할 때 |
| C. 회사 클라우드/서버 (AWS 등) | 회사 보안 정책과 맞추기 쉬움 | 서버·네트워크 설정을 직접 해야 함 | 사내 인프라 담당자가 있을 때 |

> **회사 서비스로 운영한다면** 외부 클라우드 사용과 회사 도메인 사용이 사내 정책상 괜찮은지 IT/보안 담당자에게 먼저 확인하세요. 이 서비스에는 이메일과 글 내용이 저장됩니다.

아래는 **A. Railway** 기준입니다. B 를 고르면 6장을 참고하세요.

## 2. 사전 준비 (최초 1회)

### 2-1. GitHub 저장소 만들기
1. GitHub 에 가입하고, 팀원과 함께 쓸 **Organization**(무료)을 만들거나 개인 계정을 씁니다.
2. **Private** 저장소를 만듭니다 (예: `essay-writing`).
3. 이 폴더에서:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<조직이름>/essay-writing.git
   git push -u origin main
   ```
   `.env.local`(비밀 값)은 `.gitignore` 에 들어 있어 올라가지 않습니다. **비밀번호·키는 절대 커밋하지 마세요.**
4. 저장소 Settings → Collaborators 에서 팀원을 초대합니다.

### 2-2. 비밀 키 만들기
```bash
openssl rand -base64 32
```
출력된 문자열을 `BETTER_AUTH_SECRET` 로 씁니다. 로컬용과 운영용은 **서로 다른 값**을 쓰고, 운영 값은 플랫폼 화면에만 저장합니다.

## 3. Railway 에 배포하기

1. https://railway.com 에 GitHub 계정으로 가입합니다.
2. **New Project → Deploy from GitHub repo** → `essay-writing` 선택. 앱 서비스가 하나 생깁니다.
3. 같은 프로젝트에서 **New → Database → PostgreSQL** 을 추가합니다.
4. 앱 서비스의 **Variables** 탭에 환경 변수를 넣습니다.

   | 이름 | 값 |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway 가 DB 주소를 자동으로 연결해 주는 참조 문법) |
   | `BETTER_AUTH_SECRET` | 2-2 에서 만든 값 |
   | `BETTER_AUTH_URL` | 서비스 주소. 처음엔 5번에서 받은 `https://….up.railway.app` |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | 첫 관리자 계정 정보 (7번 이후 지워도 됨) |

   `DATABASE_URL_TEST`, `DISABLE_RATE_LIMIT` 는 **운영에 넣지 않습니다.**
5. 앱 서비스 **Settings → Networking → Generate Domain** 을 누르면 `https://xxxx.up.railway.app` 주소가 생깁니다. 이 주소를 `BETTER_AUTH_URL` 에 넣습니다.
6. **Settings → Deploy** 에서:
   - Pre-deploy Command: `npm run db:migrate` (매 배포마다 DB 구조를 최신으로 맞춤)
     - 이 항목이 없다면 Start Command 를 `npm run db:migrate && npm run start` 로 둡니다.
   - Healthcheck Path: `/api/health`
7. 배포가 끝나면 첫 관리자를 만듭니다. 내 PC 에 Railway CLI 를 설치하고 실행합니다.
   ```bash
   npm i -g @railway/cli
   railway login
   railway link            # 프로젝트와 앱 서비스 선택
   railway run npm run admin:create
   ```
   `railway run` 은 운영 환경 변수를 넣은 채로 내 PC 에서 명령을 실행합니다. 이때 DB 에 접속하려면 Postgres 서비스의 **공개 접속 주소(Public Networking)** 가 필요할 수 있습니다. 안 되면 Postgres 서비스의 Variables 에서 `DATABASE_PUBLIC_URL` 을 복사해 `DATABASE_URL=<그 값> npm run admin:create` 로 실행합니다.
8. 브라우저로 주소에 접속 → 관리자로 로그인 → **관리자 → 계정 발급**에서 팀원·사용자 계정을 만듭니다.

### 배포 확인 (스모크 테스트)
- `https://주소/api/health` 가 `{"ok":true}` 를 돌려주는지
- 로그인 → Markdown 파일 업로드 → 게시 → 문장 하이라이트 저장 → `/my/highlights` 에서 확인

## 4. 주소(도메인) 연결

플랫폼이 준 `xxxx.up.railway.app` 만으로도 운영할 수 있습니다. 보기 좋은 주소가 필요하면:

- **회사 도메인 아래에 두기** (예: `essay.mediwhale.com`): 회사 DNS 를 관리하는 담당자에게 요청합니다.
- **새 도메인 구입**: 가비아, Cloudflare, Namecheap 등에서 연 단위로 구입합니다.

연결 순서:
1. Railway 앱 서비스 → Settings → Networking → **Custom Domain** 에 `essay.example.com` 입력
2. Railway 가 보여 주는 **CNAME 값**을 DNS 관리 화면(또는 담당자)에 등록
   - 종류: `CNAME`, 이름: `essay`, 값: Railway 가 알려 준 주소
3. 몇 분~몇 시간 뒤 연결되면 HTTPS 인증서는 Railway 가 자동으로 발급합니다.
4. 환경 변수 `BETTER_AUTH_URL` 을 `https://essay.example.com` 으로 바꾸고 다시 배포합니다. **이걸 바꾸지 않으면 로그인이 실패합니다.**

## 5. 팀 협업 방식

### 매일의 작업 흐름
```text
1. main 에서 새 브랜치 만들기     git switch -c feat/글-목록-개선
2. 로컬에서 개발·테스트           npm run dev / npm test
3. 커밋 후 GitHub 에 올리기       git push -u origin feat/글-목록-개선
4. GitHub 에서 Pull Request 생성  → CI(검사·테스트·빌드)가 자동 실행
5. 팀원 리뷰 → main 에 병합       → Railway 가 자동 배포
```

- CI 설정은 [.github/workflows/ci.yml](../.github/workflows/ci.yml) 에 있습니다. PR 마다 타입 검사, 린트, 단위·통합 테스트, 빌드를 실행합니다.
- 저장소 Settings → Branches 에서 `main` 에 **"PR 필수 + CI 통과 필수"** 규칙을 걸어 두면, 실수로 깨진 코드가 배포되지 않습니다.
- 각 개발자는 README 의 "빠른 시작"대로 자기 PC 에 Docker DB 를 띄워 개발합니다. 운영 DB 에 직접 연결해 개발하지 않습니다.

### DB 구조를 바꿀 때
1. `src/lib/db/schema.ts` 수정
2. `npm run db:generate` → `drizzle/` 에 SQL 파일 생성 → 내용 확인
3. 로컬에서 `npm run db:migrate` 후 테스트
4. SQL 파일까지 함께 커밋 → 배포 시 자동 적용

데이터를 지우는 변경(테이블·컬럼 삭제)은 PR 설명에 꼭 적고, 배포 전에 백업을 받습니다.

### 운영 환경을 하나 더 둘지 (스테이징)
5~10명 규모에서는 처음엔 운영 환경 하나로 충분합니다. 큰 변경을 미리 확인하고 싶어지면 Railway 에서 환경(Environment)을 하나 더 만들어 `staging` 브랜치를 연결합니다.

## 6. Vercel + Neon 을 고른 경우 차이점

- Neon 에서 DB 를 만들고, **pooled 연결 문자열**을 `DATABASE_URL` 로 씁니다.
- [src/lib/content/file-validation.ts](../src/lib/content/file-validation.ts) 의 `MAX_UPLOAD_BYTES` 를 `4 * 1024 * 1024` 로 낮춥니다 (Vercel 요청 크기 제한).
- 마이그레이션은 배포 전에 로컬에서 `DATABASE_URL=<Neon 주소> npm run db:migrate` 로 실행하거나, Vercel Build Command 를 `npm run db:migrate && npm run build` 로 바꿉니다.
- 요청 제한(rate limit)은 서버 인스턴스마다 따로 동작합니다. 소규모에서는 문제없습니다.

## 7. 운영 체크리스트

| 항목 | 방법 |
|---|---|
| 백업 | 플랫폼의 DB 백업 기능 사용 여부를 확인합니다. 없거나 부족하면 주 1회 `pg_dump "$DATABASE_PUBLIC_URL" > backup-YYYYMMDD.sql` |
| 장애 확인 | `/api/health` 를 무료 모니터링 서비스(UptimeRobot 등)에 등록해 두면 서비스가 멈췄을 때 메일을 받습니다 |
| 로그 | Railway 앱 서비스 → Deployments → 로그 보기 |
| 비밀번호 분실 | 현재 관리자 화면에 재설정 기능이 없습니다. 관리자가 새 계정을 만들거나, 개발자가 DB 작업으로 처리합니다 (status.md 다음 작업 1번) |
| 보안 업데이트 | 한 달에 한 번 `npm audit` 와 Next.js 패치 버전을 확인해 올립니다 |
| 비밀 키 유출 시 | `BETTER_AUTH_SECRET` 을 새 값으로 바꾸고 재배포합니다 (모든 사용자가 다시 로그인하게 됨) |

## 8. 용어

| 용어 | 뜻 |
|---|---|
| 빌드 | 코드를 실행 가능한 형태로 변환하는 과정 (`npm run build`) |
| 환경 변수 | 코드 밖에서 넣어 주는 설정 값. 비밀 키나 DB 주소처럼 환경마다 다른 값 |
| 마이그레이션 | DB 테이블 구조를 바꾸는 SQL 스크립트. 순서대로 한 번씩만 실행됨 |
| DNS / CNAME | 도메인 이름을 실제 서버 주소로 연결하는 설정 / 그 연결 방식 중 하나 |
| CI | 코드를 올릴 때마다 자동으로 테스트를 돌리는 것 |
| 헬스 체크 | 서비스가 살아 있는지 확인하는 주소 (`/api/health`) |
