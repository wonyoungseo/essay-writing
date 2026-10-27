import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-end sm:px-6">
        <nav aria-label="하단 메뉴" className="flex gap-4">
          <Link href="/about" className="hover:text-ink">
            소개
          </Link>
          <Link href="/about#guide" className="hover:text-ink">
            이용 안내
          </Link>
          <Link href="/about#privacy" className="hover:text-ink">
            개인정보 처리방침
          </Link>
        </nav>
      </div>
    </footer>
  );
}
