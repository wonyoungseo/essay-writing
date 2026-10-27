import Link from "next/link";
import { cn } from "@/lib/cn";

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
  const item = "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm";
  return (
    <nav aria-label="페이지 이동" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "text-ink-soft hover:bg-paper-deep")} rel="prev">
          ← 이전
        </Link>
      ) : (
        <span className={cn(item, "text-muted/50")} aria-disabled>
          ← 이전
        </span>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(item, p === page ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep")}
        >
          {p}
        </Link>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "text-ink-soft hover:bg-paper-deep")} rel="next">
          다음 →
        </Link>
      ) : (
        <span className={cn(item, "text-muted/50")} aria-disabled>
          다음 →
        </span>
      )}
    </nav>
  );
}
