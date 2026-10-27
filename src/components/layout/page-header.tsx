import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-medium tracking-widest text-accent uppercase">{eyebrow}</p>}
        <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Container({ children, size = "wide" }: { children: ReactNode; size?: "wide" | "narrow" | "reading" }) {
  const max = size === "reading" ? "max-w-[720px]" : size === "narrow" ? "max-w-3xl" : "max-w-6xl";
  return <div className={`mx-auto w-full ${max} px-4 sm:px-6`}>{children}</div>;
}
