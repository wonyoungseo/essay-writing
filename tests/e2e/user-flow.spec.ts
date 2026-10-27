import path from "node:path";
import { expect, test } from "@playwright/test";
import { ADMIN, login, logout, paintedHighlights, READER, selectText, WRITER } from "./helpers";

test.describe.configure({ mode: "serial" });

let postUrl = "";

test("1~4. 로그인 → Markdown 업로드 → 제목/태그 입력 → 게시 → 홈에서 확인", async ({ page }) => {
  await login(page, WRITER, "/upload");
  await expect(page).toHaveURL(/\/upload$/);

  // 지원하지 않는 파일 안내
  await page.locator('input[type="file"]').setInputFiles(path.join(import.meta.dirname, "files/fake.png"));
  await expect(page.getByText("지원하지 않는 파일 형식입니다")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(path.join(import.meta.dirname, "files/essay.md"));
  await expect(page.getByText("essay.md")).toBeVisible();
  await expect(page.getByLabel("제목")).toHaveValue("비 오는 날의 서점");
  // 미리보기: 스크립트는 제거되고 본문은 보인다
  await expect(page.getByRole("tabpanel").getByText("종이 냄새가 먼저 인사를 했다")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();

  await page.getByLabel("제목").fill("비 오는 날의 서점 (E2E)");
  const tagInput = page.getByRole("textbox", { name: "태그" });
  await tagInput.fill("산책");
  await tagInput.press("Enter");
  await tagInput.fill("비");
  await tagInput.press("Enter");
  await page.getByRole("button", { name: "검토하기" }).click();

  await expect(page.getByText("게시하기 전에 마지막으로 확인해 주세요")).toBeVisible();
  await expect(page.getByText("#산책 #비")).toBeVisible();
  await page.getByRole("button", { name: "게시하기" }).click();

  await expect(page.getByText("글이 게시되었습니다.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "비 오는 날의 서점 (E2E)" })).toBeVisible();
  postUrl = new URL(page.url()).pathname;

  await page.goto("/");
  await expect(page.getByRole("link", { name: "비 오는 날의 서점 (E2E)" })).toBeVisible();
});

test("5~7. 다른 사용자가 댓글/하이라이트 → 새로고침 후 유지 → 마이페이지 확인", async ({ page }) => {
  await login(page, READER, postUrl);
  await expect(page).toHaveURL(postUrl);
  await expect(page.locator('[data-testid="essay-body"] script')).toHaveCount(0);

  // 반응 기능은 제공하지 않는다
  await expect(page.getByRole("heading", { name: "이 글에 반응하기" })).toHaveCount(0);

  // 댓글
  await page.getByRole("textbox", { name: "감상과 피드백" }).fill("빗소리가 들리는 것 같은 글이에요.");
  await page.getByRole("button", { name: "남기기" }).click();
  await expect(page.getByText("빗소리가 들리는 것 같은 글이에요.")).toBeVisible();

  // 하이라이트: 실제 선택 → 저장
  await selectText(page, "오래 머문 자리에는 언제나 이야기가 남는다.");
  await page.getByRole("button", { name: "✎ 선택한 문장 저장" }).click();
  await expect(page.getByTestId("highlight-toast")).toContainText("문장을 저장했습니다.");
  await expect.poll(() => paintedHighlights(page)).toEqual(["오래 머문 자리에는 언제나 이야기가 남는다."]);

  // 새로고침 후에도 댓글, 하이라이트가 유지된다 (서버 오프셋 = 브라우저 textContent 오프셋)
  await page.reload();
  await expect(page.getByText("빗소리가 들리는 것 같은 글이에요.")).toBeVisible();
  await expect.poll(() => paintedHighlights(page)).toEqual(["오래 머문 자리에는 언제나 이야기가 남는다."]);

  // 마이페이지 하이라이트 → 클릭하면 글로 이동
  await page.goto("/my/highlights");
  const saved = page.getByRole("link", { name: "오래 머문 자리에는 언제나 이야기가 남는다." });
  await expect(saved).toBeVisible();
  await saved.click();
  await expect(page).toHaveURL(postUrl);

  // 작성자 전용 메뉴는 보이지 않는다
  await expect(page.getByRole("link", { name: "수정" })).toHaveCount(0);
});

test("9. 권한이 없는 사용자의 수정 페이지 접근은 거부된다", async ({ page }) => {
  await login(page, READER, `${postUrl}/edit`);
  await expect(page.getByText("본인이 작성한 글만 수정할 수 있습니다.")).toBeVisible();
});

test("8. 작성자가 글을 수정하면 검색 결과에 반영되고, 받은 피드백과 알림을 확인한다", async ({ page }) => {
  await login(page, WRITER, `${postUrl}/edit`);
  await page.getByLabel("제목").fill("맑은 날의 서점");
  await page.getByRole("tab", { name: "Markdown 편집" }).click();
  const body = page.getByLabel("Markdown 본문");
  await body.fill(`새로 쓴 첫 문단.\n\n${await body.inputValue()}`);
  await page.getByRole("button", { name: "검토하기" }).click();
  await page.getByRole("button", { name: "수정 내용 저장" }).click();
  await expect(page.getByText("수정 내용을 저장했습니다.")).toBeVisible();

  await page.goto("/explore?q=" + encodeURIComponent("맑은 날"));
  await expect(page.getByRole("link", { name: "맑은 날의 서점" })).toBeVisible();
  await page.goto("/explore?q=" + encodeURIComponent("비 오는 날"));
  await expect(page.getByText("조건에 맞는 글이 없습니다.")).toBeVisible();
  await page.goto("/explore?tag=" + encodeURIComponent("산책"));
  await expect(page.getByRole("link", { name: "맑은 날의 서점" })).toBeVisible();

  await page.goto("/my/feedback");
  await expect(page.getByText("빗소리가 들리는 것 같은 글이에요.")).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByText("에 감상을 남겼습니다.")).toBeVisible();
});

test("본문 앞에 문단이 추가되어도 하이라이트 위치를 다시 찾는다", async ({ page }) => {
  await login(page, READER, postUrl);
  await expect.poll(() => paintedHighlights(page)).toEqual(["오래 머문 자리에는 언제나 이야기가 남는다."]);
});

test("Word 파일 업로드 → 비공개 게시 → 다른 사용자에게는 404", async ({ page }) => {
  await login(page, WRITER, "/upload");
  await page.locator('input[type="file"]').setInputFiles(path.join(import.meta.dirname, "files/winter.docx"));
  await expect(page.getByLabel("제목")).toHaveValue("겨울 일기");
  await expect(page.getByRole("tabpanel").getByRole("heading", { name: "두 번째 장" })).toBeVisible();
  await page.getByText("비공개", { exact: true }).click();
  await page.getByRole("button", { name: "검토하기" }).click();
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page.getByText("비공개 · 나만 볼 수 있어요")).toBeVisible();
  const privateUrl = new URL(page.url()).pathname;

  await logout(page);
  const res = await page.goto(privateUrl);
  expect(res?.status()).toBe(404);
  await login(page, READER, privateUrl);
  await expect(page.getByText("찾으시는 글이 없거나 볼 수 없는 글입니다.")).toBeVisible();
  await page.goto("/explore?q=" + encodeURIComponent("겨울 일기"));
  await expect(page.getByText("조건에 맞는 글이 없습니다.")).toBeVisible();
});

test("라이트/다크 테마를 전환하면 새로고침 후에도 유지된다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "다크 모드로 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "라이트 모드로 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("비로그인 사용자는 읽기만 가능하고 쓰기 페이지는 로그인으로 이동한다", async ({ page }) => {
  await page.goto(postUrl);
  await expect(page.getByRole("link", { name: "로그인", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "감상과 피드백" })).toHaveCount(0);
  await page.goto("/upload");
  await expect(page).toHaveURL(/\/login\?next=%2Fupload/);
  await page.goto("/my/highlights");
  await expect(page).toHaveURL(/\/login/);
  // 회원가입 페이지/링크가 없다
  const signup = await page.goto("/signup");
  expect(signup?.status()).toBe(404);
});

test("관리자: 계정 발급 → 새 계정 로그인, 일반 사용자는 관리자 페이지 접근 불가", async ({ page }) => {
  await login(page, READER, "/admin");
  await expect(page.getByText("관리자만 접근할 수 있는 페이지입니다.")).toBeVisible();
  await logout(page);

  await login(page, ADMIN, "/admin");
  await page.getByLabel("이메일").fill("e2e-new@test.local");
  await page.getByLabel("표시 이름").fill("새 독자");
  await page.getByLabel("초기 비밀번호").fill("e2e-password-1234");
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await expect(page.getByText("e2e-new@test.local 계정을 만들었습니다.")).toBeVisible();
  await expect(page.getByRole("cell", { name: /새 독자/ })).toBeVisible();
  await logout(page);

  await login(page, "e2e-new@test.local", "/my");
  await expect(page.getByRole("heading", { name: "새 독자님의 공간" })).toBeVisible();
});
