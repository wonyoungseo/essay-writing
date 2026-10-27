import { cn } from "@/lib/cn";

/** GET 폼: JS 없이도 동작하고, 검색어는 서버에서 파라미터 바인딩으로 처리된다. */
export function SearchBar({ defaultValue, className, size = "md" }: { defaultValue?: string; className?: string; size?: "md" | "lg" }) {
  return (
    <form action="/explore" method="get" role="search" className={cn("flex w-full gap-2", className)}>
      <label htmlFor="site-search" className="sr-only">
        글 검색
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        maxLength={100}
        placeholder="글 제목, 작성자, 태그 검색"
        className={cn(
          "min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-5 text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
          size === "lg" ? "h-13 text-base" : "h-11 text-sm",
        )}
      />
      <button
        type="submit"
        className={cn("shrink-0 rounded-full bg-ink px-5 font-medium text-paper hover:bg-ink-soft", size === "lg" ? "h-13" : "h-11 text-sm")}
      >
        검색
      </button>
    </form>
  );
}
