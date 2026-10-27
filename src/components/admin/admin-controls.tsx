"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { deleteCommentAction } from "@/features/comments/actions";
import { deletePostAction, setPostHiddenAction } from "@/features/posts/actions";
import { resolveReportAction } from "@/features/reports/actions";
import { createUserAction, setUserBannedAction, setUserRoleAction } from "@/features/users/actions";
import type { ActionResult } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";

function useAdminAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult<unknown>>, confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  };
  return { pending, error, run };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <span role="alert" className="block text-xs text-danger">
      {error}
    </span>
  ) : null;
}

export function CreateUserForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const input = {
      email: String(f.get("email") ?? ""),
      name: String(f.get("name") ?? ""),
      password: String(f.get("password") ?? ""),
      role: (f.get("role") === "admin" ? "admin" : "user") as "user" | "admin",
    };
    startTransition(async () => {
      const res = await createUserAction(input);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setResult({ ok: false, text: res.error });
        return;
      }
      formEl.reset();
      setErrors({});
      setResult({ ok: true, text: `${input.email} 계정을 만들었습니다. 초기 비밀번호를 안전한 방법으로 전달하고, 첫 로그인 후 변경하도록 안내해 주세요.` });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {result && <Alert tone={result.ok ? "success" : "error"}>{result.text}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="new-email" label="이메일" error={errors.email}>
          <Input id="new-email" name="email" type="email" required autoComplete="off" />
        </Field>
        <Field id="new-name" label="표시 이름" error={errors.name}>
          <Input id="new-name" name="name" required maxLength={30} />
        </Field>
        <Field id="new-password" label="초기 비밀번호" hint="8자 이상" error={errors.password}>
          <Input id="new-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field id="new-role" label="권한">
          <Select id="new-role" name="role" defaultValue="user">
            <option value="user">일반 사용자</option>
            <option value="admin">관리자</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중…" : "계정 만들기"}
      </Button>
    </form>
  );
}

export function UserRowActions({ userId, banned, role, isSelf }: { userId: string; banned: boolean; role: string; isSelf: boolean }) {
  const { pending, error, run } = useAdminAction();
  if (isSelf) return <span className="text-xs text-muted">본인</span>;
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => run(() => setUserRoleAction(userId, role === "admin" ? "user" : "admin"), role === "admin" ? "관리자 권한을 해제할까요?" : "관리자 권한을 부여할까요?")}
      >
        {role === "admin" ? "관리자 해제" : "관리자 지정"}
      </Button>
      <Button
        size="sm"
        variant={banned ? "secondary" : "danger"}
        disabled={pending}
        onClick={() => run(() => setUserBannedAction(userId, !banned), banned ? undefined : "이 사용자의 이용을 정지할까요? 모든 로그인 세션이 해제됩니다.")}
      >
        {banned ? "정지 해제" : "이용 정지"}
      </Button>
      <ErrorText error={error} />
    </div>
  );
}

export function PostRowActions({ postId, hidden }: { postId: string; hidden: boolean }) {
  const { pending, error, run } = useAdminAction();
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setPostHiddenAction(postId, !hidden))}>
        {hidden ? "숨김 해제" : "숨기기"}
      </Button>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => deletePostAction(postId), "이 글을 영구 삭제할까요?")}>
        삭제
      </Button>
      <ErrorText error={error} />
    </div>
  );
}

export function CommentRowActions({ commentId }: { commentId: string }) {
  const { pending, error, run } = useAdminAction();
  return (
    <div className="text-right">
      <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => deleteCommentAction(commentId), "이 댓글을 삭제할까요?")}>
        삭제
      </Button>
      <ErrorText error={error} />
    </div>
  );
}

export function ReportRowActions({ reportId }: { reportId: string }) {
  const { pending, error, run } = useAdminAction();
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "resolved"))}>
        처리 완료
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "dismissed"))}>
        기각
      </Button>
      <ErrorText error={error} />
    </div>
  );
}
