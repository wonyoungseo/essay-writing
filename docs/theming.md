# 테마 (라이트 / 다크)

사용자는 헤더의 ☾ / ☀ 버튼으로 **라이트(먹과 여백)** 와 **다크(밤의 서재)** 를 고를 수 있습니다. 선택은 브라우저 쿠키(`theme`)에 1년간 저장되고, 고르지 않은 사용자는 기본 테마(라이트)를 봅니다.

| id | 이름 | 느낌 |
|---|---|---|
| `light` | 먹과 여백 (기본) | 흰 바탕, 남색 강조, 고딕 본문 |
| `dark` | 밤의 서재 | 어두운 바탕, 호박색 강조 |

## 바꾸는 방법

- **기본 테마**: [src/lib/theme.ts](../src/lib/theme.ts) 의 `DEFAULT_THEME`
- **색상·글꼴 값**: [src/app/themes.css](../src/app/themes.css) 의 `[data-theme="light"]`, `[data-theme="dark"]` 블록
  - `--color-paper` 배경, `--color-ink` 글자, `--color-accent` 강조색, `--color-mark` 하이라이트 색, `--font-serif` 본문 글꼴
  - [src/app/globals.css](../src/app/globals.css) 의 `@theme` 블록은 Tailwind 가 유틸리티를 만들기 위한 기본값이며, 실제 화면 값은 themes.css 가 덮어씁니다.
- **테마 추가**: themes.css 에 블록 하나 + theme.ts 의 `THEMES` 에 항목 하나. (현재 버튼은 두 테마를 오가는 토글이라, 셋 이상이면 선택 메뉴로 바꿔야 합니다: [theme-toggle.tsx](../src/components/layout/theme-toggle.tsx))
