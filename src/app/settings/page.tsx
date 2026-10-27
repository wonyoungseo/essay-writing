import type { Metadata } from "next";
import { MyNav } from "@/components/layout/my-nav";
import { Container, PageHeader } from "@/components/layout/page-header";
import { requireViewerOrRedirect } from "@/lib/auth/session";
import { PasswordForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const viewer = await requireViewerOrRedirect("/settings");
  return (
    <Container>
      <div className="pt-10">
        <PageHeader eyebrow="Settings" title="설정" />
        <MyNav current="/settings" />
        <div className="grid max-w-3xl gap-10">
          <section aria-labelledby="profile-h" className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <h2 id="profile-h" className="mb-5 font-serif text-lg font-bold">
              프로필
            </h2>
            <ProfileForm name={viewer.name} />
          </section>
          <section aria-labelledby="account-h" className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <h2 id="account-h" className="mb-1 font-serif text-lg font-bold">
              계정
            </h2>
            <p className="mb-5 text-sm text-muted">
              로그인 이메일: <span className="font-medium text-ink">{viewer.email}</span> · 이메일 변경과 계정 삭제는 운영자에게 요청해 주세요.
            </p>
            <PasswordForm />
          </section>
        </div>
      </div>
    </Container>
  );
}
