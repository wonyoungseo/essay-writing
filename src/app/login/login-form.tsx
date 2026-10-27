"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setPending(false);
      // 계정 존재 여부를 노출하지 않도록 일반화된 메시지를 사용한다.
      setError(
        error.code === "BANNED_USER"
          ? "이용이 정지된 계정입니다. 관리자에게 문의해 주세요."
          : error.status === 429
            ? "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요."
            : "이메일 또는 비밀번호가 올바르지 않습니다.",
      );
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="email" label="이메일">
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!error} />
      </Field>
      <Field id="password" label="비밀번호">
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!error} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
