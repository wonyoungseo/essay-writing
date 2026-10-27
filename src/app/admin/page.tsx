import type { Metadata } from "next";
import Link from "next/link";
import {
  CommentRowActions,
  CreateUserForm,
  PostRowActions,
  ReportRowActions,
  UserRowActions,
} from "@/components/admin/admin-controls";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { requireViewerOrRedirect } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format";
import { isAdmin } from "@/lib/permissions";
import { listRecentComments } from "@/features/comments/service";
import { listAllPostsForAdmin } from "@/features/posts/service";
import { listReports } from "@/features/reports/service";
import { listUsers } from "@/features/users/service";

export const metadata: Metadata = { title: "관리자", robots: { index: false } };

const TABS = [
  { key: "users", label: "사용자" },
  { key: "posts", label: "게시글" },
  { key: "comments", label: "댓글" },
  { key: "reports", label: "신고" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const th = "px-3 py-2.5 text-left text-xs font-medium text-muted";
const td = "px-3 py-3 align-top";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; status?: string }> }) {
  const viewer = await requireViewerOrRedirect("/admin");
  if (!isAdmin(viewer)) {
    return (
      <Container size="narrow">
        <div className="py-16">
          <Alert tone="error">관리자만 접근할 수 있는 페이지입니다.</Alert>
        </div>
      </Container>
    );
  }
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "users";
  const page = Math.max(1, Number(sp.page) || 1);
  const reportStatus = sp.status === "resolved" || sp.status === "dismissed" ? sp.status : "open";

  return (
    <Container>
      <div className="pt-10">
        <PageHeader eyebrow="Admin" title="관리자" description="계정 발급과 콘텐츠 관리를 합니다. 비공개 글의 본문은 관리자도 열람할 수 없습니다." />
        <nav aria-label="관리 메뉴" className="mb-8 border-b border-line">
          <ul className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <li key={t.key}>
                <Link
                  href={`/admin?tab=${t.key}`}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-block border-b-2 px-4 py-3 text-sm",
                    tab === t.key ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {tab === "users" && <UsersTab viewerId={viewer.id} viewer={viewer} />}
        {tab === "posts" && <PostsTab viewer={viewer} page={page} />}
        {tab === "comments" && <CommentsTab />}
        {tab === "reports" && <ReportsTab viewer={viewer} status={reportStatus} />}
      </div>
    </Container>
  );
}

type V = Awaited<ReturnType<typeof requireViewerOrRedirect>>;

async function UsersTab({ viewer, viewerId }: { viewer: V; viewerId: string }) {
  const users = await listUsers(viewer);
  return (
    <div className="space-y-10">
      <section aria-labelledby="create-user" className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <h2 id="create-user" className="font-serif text-lg font-bold">
          계정 발급
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted">공개 회원가입이 없으므로 관리자가 계정을 직접 만듭니다.</p>
        <CreateUserForm />
      </section>
      <section aria-labelledby="user-list">
        <h2 id="user-list" className="mb-3 font-serif text-lg font-bold">
          사용자 {users.length}명
        </h2>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-paper-deep/50">
              <tr>
                <th className={th}>이름 / 이메일</th>
                <th className={th}>상태</th>
                <th className={th}>활동</th>
                <th className={th}>가입일</th>
                <th className={cn(th, "text-right")}>관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={td}>
                    <span className="font-medium text-ink">{u.name}</span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </td>
                  <td className={td}>
                    <span className="flex flex-wrap gap-1">
                      {u.role === "admin" && <Badge tone="accent">관리자</Badge>}
                      {u.banned ? <Badge tone="danger">정지</Badge> : <Badge>활성</Badge>}
                    </span>
                  </td>
                  <td className={cn(td, "text-xs text-muted")}>
                    글 {u.postCount} · 댓글 {u.commentCount}
                  </td>
                  <td className={cn(td, "text-xs text-muted")}>{formatDate(u.createdAt)}</td>
                  <td className={td}>
                    <UserRowActions userId={u.id} banned={u.banned} role={u.role} isSelf={u.id === viewerId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function PostsTab({ viewer, page }: { viewer: V; page: number }) {
  const result = await listAllPostsForAdmin(viewer, page);
  if (result.items.length === 0) return <EmptyState title="게시글이 없습니다." />;
  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line bg-paper-deep/50">
            <tr>
              <th className={th}>제목</th>
              <th className={th}>작성자</th>
              <th className={th}>상태</th>
              <th className={th}>작성일</th>
              <th className={cn(th, "text-right")}>관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {result.items.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  {p.visibility === "public" && p.status === "published" ? (
                    <Link href={`/posts/${p.id}`} className="font-medium text-ink hover:underline">
                      {p.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">{p.title}</span>
                  )}
                  <span className="block text-xs text-muted">댓글 {p.commentCount}</span>
                </td>
                <td className={cn(td, "text-ink-soft")}>{p.authorName}</td>
                <td className={td}>
                  <span className="flex flex-wrap gap-1">
                    {p.visibility === "private" ? <Badge>비공개</Badge> : <Badge>공개</Badge>}
                    {p.status === "hidden" && <Badge tone="danger">숨김</Badge>}
                  </span>
                </td>
                <td className={cn(td, "text-xs text-muted")}>{formatDate(p.createdAt)}</td>
                <td className={td}>
                  <PostRowActions postId={p.id} hidden={p.status === "hidden"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => `/admin?tab=posts&page=${p}`} />
    </>
  );
}

async function CommentsTab() {
  const comments = await listRecentComments();
  if (comments.length === 0) return <EmptyState title="댓글이 없습니다." />;
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              <span className="font-medium text-ink">{c.authorName}</span> · {c.postTitle} · {formatDateTime(c.createdAt)}
            </p>
            <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap text-ink-soft">{c.content}</p>
          </div>
          <CommentRowActions commentId={c.id} />
        </li>
      ))}
    </ul>
  );
}

async function ReportsTab({ viewer, status }: { viewer: V; status: "open" | "resolved" | "dismissed" }) {
  const reports = await listReports(viewer, status);
  return (
    <div>
      <div className="mb-5 flex gap-2" role="group" aria-label="신고 상태">
        {(
          [
            ["open", "접수됨"],
            ["resolved", "처리 완료"],
            ["dismissed", "기각"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin?tab=reports&status=${key}`}
            aria-current={status === key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm",
              status === key ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft hover:bg-paper-deep",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      {reports.length === 0 ? (
        <EmptyState title="해당하는 신고가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    <Badge tone={r.targetType === "comment" ? "neutral" : "accent"}>{r.targetType === "comment" ? "댓글" : "글"}</Badge>{" "}
                    {r.reporterName} 님 신고 · {formatDateTime(r.createdAt)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-ink">사유: {r.reason}</p>
                  <p className="mt-2 text-sm text-ink-soft">
                    대상 글:{" "}
                    <Link href={`/posts/${r.postId}`} className="text-accent hover:underline">
                      {r.postTitle}
                    </Link>
                    {r.postStatus === "hidden" && " (숨김 처리됨)"}
                  </p>
                  {r.commentContent && <p className="mt-2 rounded bg-paper-deep px-3 py-2 text-sm text-ink-soft">“{r.commentContent}”</p>}
                </div>
                {status === "open" && <ReportRowActions reportId={r.id} />}
              </div>
              {status === "open" && (
                <div className="mt-4 border-t border-line pt-3">
                  {r.commentId ? <CommentRowActions commentId={r.commentId} /> : <PostRowActions postId={r.postId} hidden={r.postStatus === "hidden"} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
