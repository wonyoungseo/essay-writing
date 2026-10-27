import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { countUnread } from "@/features/notifications/service";
import { buttonClass } from "@/components/ui/button";
import { getTheme } from "@/lib/theme-server";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

const navLink = "rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink";

export async function SiteHeader() {
  const viewer = await getViewer();
  const unread = viewer && !viewer.banned ? await countUnread(viewer) : 0;
  const theme = await getTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        본문 바로가기
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-serif text-lg font-bold text-ink">
          에세이 글쓰기
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
          <ThemeToggle current={theme} className="size-9 justify-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink" />
          <Link href="/explore" className={navLink}>
            탐색
          </Link>
          {viewer ? (
            <>
              <Link href="/my/highlights" className={navLink}>
                하이라이트
              </Link>
              <Link href="/my" className={navLink}>
                내 공간
              </Link>
              <Link href="/notifications" className={`${navLink} relative`} aria-label={unread ? `알림 ${unread}개 읽지 않음` : "알림"}>
                알림
                {unread > 0 && (
                  <span aria-hidden className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-paper">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <details className="relative">
                <summary className={`${navLink} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                  {viewer.name} <span aria-hidden>▾</span>
                </summary>
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-line bg-surface p-1 shadow-lg">
                  <Link href="/settings" className="block rounded-md px-3 py-2 text-sm hover:bg-paper-deep">
                    설정
                  </Link>
                  {isAdmin(viewer) && (
                    <Link href="/admin" className="block rounded-md px-3 py-2 text-sm hover:bg-paper-deep">
                      관리자
                    </Link>
                  )}
                  <SignOutButton className="block w-full rounded-md px-3 py-2 text-sm hover:bg-paper-deep" />
                </div>
              </details>
              <Link href="/upload" className={buttonClass("primary", "sm", "ml-2")}>
                글 올리기
              </Link>
            </>
          ) : (
            <Link href="/login" className={buttonClass("secondary", "sm", "ml-2")}>
              로그인
            </Link>
          )}
        </nav>

        {/* 모바일: 테마 전환 + JS 없이 동작하는 disclosure 메뉴 */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle current={theme} className="size-10 justify-center rounded-full text-ink-soft hover:bg-paper-deep" />
          <details className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-1 rounded-full border border-line px-4 text-sm [&::-webkit-details-marker]:hidden">
              메뉴{unread > 0 && <span className="ml-1 size-2 rounded-full bg-accent" aria-label="읽지 않은 알림 있음" />}
            </summary>
            <nav aria-label="모바일 메뉴" className="absolute right-0 mt-2 w-56 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
              <Link href="/explore" className="block rounded-md px-3 py-2.5 text-sm hover:bg-paper-deep">
                탐색
              </Link>
              {viewer ? (
                <>
                  <Link href="/upload" className="block rounded-md px-3 py-2.5 text-sm font-medium text-accent hover:bg-paper-deep">
                    글 올리기
                  </Link>
                  <Link href="/my/highlights" className="block rounded-md px-3 py-2.5 text-sm hover:bg-paper-deep">
                    하이라이트
                  </Link>
                  <Link href="/my" className="block rounded-md px-3 py-2.5 text-sm hover:bg-paper-deep">
                    내 공간
                  </Link>
                  <Link href="/notifications" className="block rounded-md px-3 py-2.5 text-sm hover:bg-paper-deep">
                    알림 {unread > 0 && `(${unread})`}
                  </Link>
                  <Link href="/settings" className="block rounded-md px-3 py-2.5 text-sm hover:bg-paper-deep">
                    설정
                  </Link>
                  {isAdmin(viewer) && (
                    <Link href="/admin" className="block rounded-md px-3 py-2.5 text-sm hover:bg-paper-deep">
                      관리자
                    </Link>
                  )}
                  <SignOutButton className="block w-full rounded-md px-3 py-2.5 text-sm hover:bg-paper-deep" />
                </>
              ) : (
                <Link href="/login" className="block rounded-md px-3 py-2.5 text-sm hover:bg-paper-deep">
                  로그인
                </Link>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
