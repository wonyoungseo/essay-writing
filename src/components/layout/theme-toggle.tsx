"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { THEME_COOKIE, THEMES, type ThemeId } from "@/lib/theme";

/** 화면에 즉시 반영하고, 다음 방문에도 유지되도록 쿠키에 저장한다. */
function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  document.cookie = `${THEME_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", THEMES.find((t) => t.id === id)!.themeColor);
}

export function ThemeToggle({ current, className, showLabel = false }: { current: ThemeId; className?: string; showLabel?: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isDark = current === "dark";
  const label = isDark ? "라이트 모드로 전환" : "다크 모드로 전환";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        applyTheme(isDark ? "light" : "dark");
        startTransition(() => router.refresh());
      }}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span aria-hidden className="text-base leading-none">
        {isDark ? "☀" : "☾"}
      </span>
      {showLabel && <span>{isDark ? "라이트 모드" : "다크 모드"}</span>}
    </button>
  );
}
