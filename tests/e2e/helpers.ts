import { expect, type Page } from "@playwright/test";

export const PASSWORD = "e2e-password-1234";
export const WRITER = "e2e-writer@test.local";
export const READER = "e2e-reader@test.local";
export const ADMIN = "e2e-admin@test.local";

export async function login(page: Page, email: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** 본문에서 특정 문장을 실제 브라우저 Selection 으로 선택한다. */
export async function selectText(page: Page, text: string) {
  await page.evaluate((target) => {
    const container = document.querySelector('[data-testid="essay-body"]')!;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const idx = (node as Text).data.indexOf(target);
      if (idx >= 0) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + target.length);
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
    }
    throw new Error(`text not found: ${target}`);
  }, text);
}

/** CSS Highlight 레지스트리에 칠해진 텍스트 목록 */
export async function paintedHighlights(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const h = CSS.highlights.get("saved-highlight");
    return h ? [...h].map((r) => (r as Range).toString()) : [];
  });
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
