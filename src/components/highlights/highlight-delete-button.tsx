"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteHighlightAction } from "@/features/highlights/actions";

export function HighlightDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="rounded-full px-2.5 py-1 text-xs text-danger hover:bg-danger-soft disabled:opacity-50"
        onClick={() => {
          if (!window.confirm("이 하이라이트를 삭제할까요?")) return;
          startTransition(async () => {
            const res = await deleteHighlightAction(id);
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "삭제 중…" : "삭제"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
