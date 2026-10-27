"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { updateProfileAction } from "@/features/users/actions";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateProfileAction({ name: value });
          setResult(res.ok ? { ok: true, text: "표시 이름을 변경했습니다." } : { ok: false, text: res.fieldErrors?.name ?? res.error });
          if (res.ok) router.refresh();
        });
      }}
    >
      {result && <Alert tone={result.ok ? "success" : "error"}>{result.text}</Alert>}
      <Field id="name" label="표시 이름" hint="글과 댓글에 작성자로 표시됩니다.">
        <Input id="name" value={value} maxLength={30} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <Button type="submit" disabled={pending || !value.trim()}>
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (newPassword.length < 8) return setResult({ ok: false, text: "새 비밀번호는 8자 이상이어야 합니다." });
    if (newPassword !== confirm) return setResult({ ok: false, text: "새 비밀번호가 서로 일치하지 않습니다." });
    setPending(true);
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setPending(false);
    if (error) setResult({ ok: false, text: "현재 비밀번호가 올바르지 않거나 변경할 수 없습니다." });
    else {
      formEl.reset();
      setResult({ ok: true, text: "비밀번호를 변경했습니다. 다른 기기의 로그인은 해제되었습니다." });
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {result && <Alert tone={result.ok ? "success" : "error"}>{result.text}</Alert>}
      <Field id="currentPassword" label="현재 비밀번호">
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field id="newPassword" label="새 비밀번호" hint="8자 이상">
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field id="confirmPassword" label="새 비밀번호 확인">
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "변경 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
