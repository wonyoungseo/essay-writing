import Link from "next/link";
import { cn } from "@/lib/cn";

export function TagLink({ name, slug, active, className }: { name: string; slug: string; active?: boolean; className?: string }) {
  return (
    <Link
      href={`/explore?tag=${encodeURIComponent(slug)}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent-strong"
          : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      #{name}
    </Link>
  );
}

export function TagText({ name }: { name: string }) {
  return <span className="text-sm text-muted">#{name}</span>;
}
