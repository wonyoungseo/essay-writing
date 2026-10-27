/**
 * 테마 설정: 라이트(먹과 여백) / 다크(밤의 서재).
 * 사용자가 헤더의 버튼으로 고르면 쿠키에 저장된다. 선택하지 않은 사용자는 DEFAULT_THEME 을 본다.
 * 각 테마의 색/글꼴 값은 src/app/themes.css 에 있다.
 */

export const THEMES = [
  { id: "light", name: "라이트", description: "먹과 여백: 흰 바탕, 남색 강조, 고딕 본문", themeColor: "#ffffff" },
  { id: "dark", name: "다크", description: "밤의 서재: 어두운 바탕, 호박색 강조", themeColor: "#1c1b19" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "light";

export const THEME_COOKIE = "theme";

export function resolveTheme(value: string | undefined | null): ThemeId {
  return THEMES.some((t) => t.id === value) ? (value as ThemeId) : DEFAULT_THEME;
}
