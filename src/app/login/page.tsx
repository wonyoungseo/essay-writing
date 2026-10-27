import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/page-header";
import { getViewer } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNextPath(next);
  const viewer = await getViewer();
  if (viewer && !viewer.banned) redirect(target);

  return (
    <Container size="narrow">
      <div className="mx-auto max-w-sm py-16 sm:py-24">
        <h1 className="font-serif text-2xl font-bold text-ink">로그인</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          에세이 글쓰기는 초대받은 분들만 글을 올리고 감상을 남길 수 있습니다. 공개된 글은 로그인 없이 읽을 수 있어요.
        </p>
        <div className="mt-8">
          <LoginForm next={target} />
        </div>
        <p className="mt-8 rounded-lg bg-paper-deep px-4 py-3 text-xs leading-relaxed text-muted">
          계정이 없으신가요? 별도의 회원가입은 제공하지 않습니다. 운영자에게 계정 발급을 요청해 주세요.
        </p>
      </div>
    </Container>
  );
}
