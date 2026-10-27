import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { resolveTheme, THEME_COOKIE } from "./theme";

/** 요청 단위로 캐시되는 현재 테마 (쿠키 → 없으면 기본값) */
export const getTheme = cache(async () => resolveTheme((await cookies()).get(THEME_COOKIE)?.value));
