import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, login, WRITER } from "./helpers";

test("모바일: 주요 화면에 가로 스크롤이 없고 메뉴가 동작한다", async ({ page }) => {
  for (const path of ["/", "/explore", "/login", "/about"]) {
    await page.goto(path);
    await expectNoHorizontalScroll(page);
  }
  await page.getByText("메뉴", { exact: true }).click();
  await expect(page.getByRole("navigation", { name: "모바일 메뉴" }).getByRole("link", { name: "탐색" })).toBeVisible();

  await login(page, WRITER, "/my");
  await expectNoHorizontalScroll(page);
  await page.goto("/upload");
  await expectNoHorizontalScroll(page);
  const firstPost = await page.goto("/");
  expect(firstPost?.ok()).toBe(true);
  const link = page.locator('a[href^="/posts/"]').first();
  if (await link.count()) {
    await link.click();
    await expect(page.locator('[data-testid="essay-body"]')).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});
