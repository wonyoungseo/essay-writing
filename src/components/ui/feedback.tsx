import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "error" | "warning";

const tones: Record<Tone, { box: string; icon: string; label: string }> = {
  info: { box: "border-line bg-surface text-ink-soft", icon: "ℹ", label: "안내" },
  success: { box: "border-success/30 bg-success-soft text-success", icon: "✓", label: "완료" },
  error: { box: "border-danger/30 bg-danger-soft text-danger", icon: "!", label: "오류" },
  warning: { box: "border-warning/30 bg-warning-soft text-warning", icon: "!", label: "주의" },
};

/** 상태를 색상만으로 구분하지 않도록 아이콘과 숨김 레이블을 함께 제공한다. */
export function Alert({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm", t.box, className)}
    >
      <span aria-hidden className="mt-px font-bold">
        {t.icon}
      </span>
      <span className="sr-only">{t.label}: </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-12 text-center", className)}>
      <p className="font-serif text-lg text-ink">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-6 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "불러오는 중" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      {label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-paper-deep", className)} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "danger" }) {
  const cls =
    tone === "accent"
      ? "bg-accent-soft text-accent-strong"
      : tone === "danger"
        ? "bg-danger-soft text-danger"
        : "bg-paper-deep text-ink-soft";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{children}</span>;
}
