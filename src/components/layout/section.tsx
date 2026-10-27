import Link from "next/link";
import type { ReactNode } from "react";

export function Section({ title, moreHref, children, id }: { title: string; moreHref?: string; children: ReactNode; id?: string }) {
  const headingId = id ?? `section-${title}`;
  return (
    <section aria-labelledby={headingId} className="py-12">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="font-serif text-xl font-bold text-ink sm:text-2xl">
          {title}
        </h2>
        {moreHref && (
          <Link href={moreHref} className="text-sm text-muted hover:text-ink">
            더 보기 →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
