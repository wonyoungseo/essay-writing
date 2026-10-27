# 아키텍처

## 구성

```text
브라우저 ──(RSC / Server Actions / fetch)──▶ Next.js 16 (Node 런타임)
                                            ├─ app/            페이지 (서버 컴포넌트가 데이터 조회)
                                            ├─ features/*/actions.ts   서버 액션: 세션 확인 → rate limit → service 호출
                                            ├─ features/*/service.ts   도메인 로직 + 권한 검증 + Drizzle 쿼리
                                            ├─ app/api/auth/[...all]   Better Auth 핸들러
                                            └─ app/api/uploads/parse   파일 검증·본문 추출 (저장하지 않음)
                                                         │
                                                         ▼
                                                 PostgreSQL 16 (pg_trgm)
```

### 계층 규칙
- **페이지/컴포넌트**는 DB 를 직접 만지지 않는다. 서버 컴포넌트는 `service` 함수를, 클라이언트 컴포넌트는 `actions` 를 호출한다.
- **service 함수는 항상 `viewer`(현재 사용자)를 인자로 받고 권한을 직접 검증**한다. 화면에서 버튼을 숨기는 것과 무관하게 서버에서 차단된다. 권한 판정은 `lib/permissions.ts` 의 순수 함수로 모아 단위 테스트한다.
- `server-only` 로 DB·인증 모듈이 클라이언트 번들에 들어가지 않게 한다.
- 오류는 `AppError(code, 사용자용 메시지)` 로 던지고, 액션에서 `ActionResult` 로 변환한다. 예상하지 못한 오류는 서버 로그에만 남기고 일반 메시지를 돌려준다.
- 읽기 권한이 없는 리소스는 `403` 대신 `404` 로 응답해 존재 여부를 숨긴다 (비공개 글, 타인의 하이라이트).

## 업로드 파이프라인

1. 클라이언트: 확장자·크기 1차 검사 (빠른 피드백)
2. `POST /api/uploads/parse`: 로그인·rate limit → `Content-Length`/파일 크기(4MB, Vercel 요청 한도 고려) → 확장자/MIME 일치 →
   - `.docx`: ZIP 시그니처, 중앙 디렉터리에서 `word/document.xml`·`[Content_Types].xml` 존재, **압축 해제 총량 40MB 이하**(zip bomb 방지) 확인 → mammoth(HTML) → turndown(Markdown). 이미지 제거.
   - `.md`: 엄격한 UTF-8 디코딩, NUL 문자 거부
3. 정규화(BOM/CRLF), 첫 줄 `# 제목` 분리, 본문 길이 제한(20만 자) → 미리보기 HTML 반환. **DB 에는 아무것도 쓰지 않는다.**
4. 사용자가 검토 후 게시 → `createPostAction` 이 입력을 다시 검증하고 저장(트랜잭션: 글 + 태그).

원본 파일은 보관하지 않는다. 실패해도 기존 데이터는 변경되지 않는다.

## 본문 렌더링과 XSS 방지

정규화된 본문은 Markdown 으로 저장한다(`posts.content`). 표시할 때마다 서버에서
`remark-parse → remark-gfm → remark-rehype(원시 HTML 미허용) → rehype-sanitize(GitHub 스키마, href: http/https/mailto, img: https) → 링크 rel 보강 → HTML` 로 변환한다.
같은 hast 트리에서 텍스트 노드를 이어 붙인 값을 `posts.content_text` 로 저장해 검색 미리보기와 하이라이트 검증에 쓴다.

## 하이라이트

- **오프셋 기준**: 본문 컨테이너의 `textContent`. 서버의 `content_text` 는 같은 규칙(hast 텍스트 노드 연결)으로 만들어지므로 브라우저와 서버의 오프셋이 일치한다 (E2E 에서 새로고침 후 칠해진 범위의 텍스트가 정확히 같은지 검증).
- **저장**: 선택 텍스트 + 시작/끝 오프셋 + 앞뒤 32자 문맥. 서버는 `content_text` 에서 위치를 다시 확인하고(없으면 거부), 오프셋·문맥을 서버 기준으로 재계산해 저장한다.
- **복원**(`features/highlights/anchor.ts`): ① 저장 위치의 텍스트가 같으면 그대로 ② 아니면 같은 텍스트의 모든 출현 위치 중 앞뒤 문맥 일치 길이가 가장 큰 곳(동점이면 원래 위치에 가까운 곳) ③ 없으면 복원 실패 → 본문에 칠하지 않고 목록에 "본문이 수정되어 위치를 찾을 수 없음" 표시.
- **표시**: CSS Custom Highlight API(`CSS.highlights` + `::highlight()`)로 칠한다. **DOM 을 수정하지 않으므로 React 렌더링과 충돌하지 않는다.** 미지원 브라우저는 목록만 표시.
- 선택 감지는 `selectionchange` 이벤트(마우스·터치·키보드 공통), 저장된 하이라이트 클릭 시 해제 메뉴.

## 인증

Better Auth(email+password, `disableSignUp`, admin 플러그인, Drizzle 어댑터). 비밀번호 해싱·세션 토큰·쿠키는 라이브러리가 담당한다. 계정 생성은 admin 플러그인의 `createUser`(관리자 세션 검증) 또는 서버 스크립트로만 가능하다. 정지 시 해당 사용자의 세션이 모두 폐기되고 로그인이 거부된다.

## 보안 체크리스트 대응

| 항목 | 대응 |
|---|---|
| 업로드 확장자·MIME·크기·실제 형식 | `lib/content/file-validation.ts` (ZIP 구조/압축 해제량, UTF-8 검사) |
| 악성 HTML/스크립트, Markdown XSS | 원시 HTML 제거 + rehype-sanitize, `javascript:`/`data:` 링크 제거 |
| 쓰기 API 인증·권한 | 모든 서버 액션이 `requireViewer()` 후 service 에서 권한 검증 |
| 비공개 글 / 하이라이트 소유권 | `canViewPost`, 하이라이트 쿼리는 항상 `user_id = viewer.id` |
| 관리자 권한 | service 의 `isAdmin` 검사 + Better Auth admin 엔드포인트 자체 검사 |
| SQL Injection | Drizzle 파라미터 바인딩, LIKE 와일드카드 이스케이프 |
| 비밀 키 | 서버 전용 환경 변수, `NEXT_PUBLIC_*` 없음, `.env*.local` git 제외 |
| 입력 길이·형식 | Zod 스키마(클라이언트·서버 공용) + DB CHECK 제약 |
| 오류 정보 노출 | `toActionError` 가 내부 오류를 일반 메시지로 치환 |
| 오픈 리다이렉트 | `safeNextPath` 로 로그인 후 이동 경로 제한 |
| 요청 제한 | Better Auth 내장 rate limit(인증), 메모리 기반 액션별 제한(업로드/댓글/하이라이트/신고) |
| 보안 헤더 | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
