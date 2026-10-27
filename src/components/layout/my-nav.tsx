import Link from "next/link";
import { cn } from "@/lib/cn";

const items = [
  { href: "/my", label: "내 글" },
  { href: "/my/highlights", label: "하이라이트" },
  { href: "/my/feedback", label: "피드백" },
  { href: "/notifications", label: "알림" },
  { href: "/settings", label: "설정" },
];

export function MyNav({ current }: { current: string }) {
  return (
    <nav aria-label="내 공간 메뉴" className="-mx-4 mb-8 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b border-line">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current === item.href ? "page" : undefined}
              className={cn(
                "-mb-px inline-block border-b-2 px-4 py-3 text-sm whitespace-nowrap",
                current === item.href ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
