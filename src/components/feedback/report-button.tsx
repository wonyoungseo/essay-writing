"use client";

import { useId, useRef, useState, useTransition } from "react";
import { createReportAction } from "@/features/reports/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export function ReportButton({ postId, commentId, label = "신고" }: { postId: string; commentId?: string; label?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await createReportAction({ postId, commentId, reason });
      if (res.ok) {
        setResult({ ok: true, text: "신고가 접수되었습니다. 관리자가 확인할 예정입니다." });
        setReason("");
      } else setResult({ ok: false, text: res.error });
    });
  }

  return (
    <>
      <button
        type="button"
        className="text-xs text-muted hover:text-danger"
        onClick={() => {
          setResult(null);
          dialogRef.current?.showModal();
        }}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[min(92vw,28rem)] rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-black/50"
      >
        <h2 id={`${id}-title`} className="font-serif text-lg font-bold">
          {commentId ? "댓글 신고" : "글 신고"}
        </h2>
        <p className="mt-1 text-sm text-muted">부적절하다고 생각하는 이유를 알려 주세요. 신고자는 공개되지 않습니다.</p>
        <label htmlFor={`${id}-reason`} className="sr-only">
          신고 사유
        </label>
        <Textarea id={`${id}-reason`} rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-4" />
        {result && (
          <p role={result.ok ? "status" : "alert"} className={`mt-2 text-sm ${result.ok ? "text-success" : "text-danger"}`}>
            {result.text}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
            닫기
          </Button>
          {!result?.ok && (
            <Button variant="danger" disabled={pending || !reason.trim()} onClick={submit}>
              {pending ? "접수 중…" : "신고하기"}
            </Button>
          )}
        </div>
      </dialog>
    </>
  );
}
