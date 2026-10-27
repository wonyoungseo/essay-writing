"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCommentAction, deleteCommentAction, updateCommentAction } from "@/features/comments/actions";
import type { CommentView } from "@/features/comments/service";
import { formatDateTime, toIso } from "@/lib/format";
import { COMMENT_MAX } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/field";
import { ReportButton } from "./report-button";

interface Props {
  postId: string;
  comments: CommentView[];
  viewerId: string | null;
  viewerIsAdmin: boolean;
  canComment: boolean;
  loginHref: string;
}

function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!content.trim()) {
          setError("내용을 입력해 주세요.");
          return;
        }
        startTransition(async () => {
          const res = await createCommentAction(postId, content);
          if (!res.ok) {
            setError(res.fieldErrors?.content ?? res.error);
            return;
          }
          setContent("");
          setError(null);
          router.refresh();
        });
      }}
      className="space-y-2"
    >
      <label htmlFor="comment-content" className="sr-only">
        감상과 피드백
      </label>
      <Textarea
        id="comment-content"
        rows={4}
        value={content}
        maxLength={COMMENT_MAX}
        onChange={(e) => setContent(e.target.value)}
        placeholder="이 글을 읽고 어떤 생각이 들었나요?"
        aria-invalid={!!error}
        aria-describedby={error ? "comment-error" : "comment-count"}
      />
      <div className="flex items-center justify-between gap-3">
        <p id="comment-count" className="text-xs text-muted">
          {content.length.toLocaleString()} / {COMMENT_MAX.toLocaleString()}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "남기는 중…" : "남기기"}
        </Button>
      </div>
      {error && (
        <p id="comment-error" role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function CommentItem({ comment, isMine, canDelete, postId }: { comment: CommentView; isMine: boolean; canDelete: boolean; postId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const edited = new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;

  return (
    <li className="py-5" id={`comment-${comment.id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold text-ink">{comment.authorName}</span>
          <span className="ml-2 text-xs text-muted">
            <time dateTime={toIso(comment.createdAt)}>{formatDateTime(comment.createdAt)}</time>
            {edited && " · 수정됨"}
          </span>
        </p>
        <div className="flex shrink-0 gap-3">
          {isMine && !editing && (
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setEditing(true)}>
              수정
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="text-xs text-muted hover:text-danger"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("이 댓글을 삭제할까요?")) return;
                startTransition(async () => {
                  const res = await deleteCommentAction(comment.id);
                  if (!res.ok) setError(res.error);
                  else router.refresh();
                });
              }}
            >
              삭제
            </button>
          )}
          {!isMine && <ReportButton postId={postId} commentId={comment.id} />}
        </div>
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <label htmlFor={`edit-${comment.id}`} className="sr-only">
            댓글 수정
          </label>
          <Textarea id={`edit-${comment.id}`} rows={3} value={draft} maxLength={COMMENT_MAX} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraft(comment.content);
                setError(null);
              }}
            >
              취소
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await updateCommentAction(comment.id, draft);
                  if (!res.ok) setError(res.fieldErrors?.content ?? res.error);
                  else {
                    setEditing(false);
                    setError(null);
                    router.refresh();
                  }
                })
              }
            >
              저장
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-ink-soft">{comment.content}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

export function CommentSection({ postId, comments, viewerId, viewerIsAdmin, canComment, loginHref }: Props) {
  return (
    <section aria-labelledby="comments-heading" className="mt-14 border-t border-line pt-10">
      <h2 id="comments-heading" className="font-serif text-xl font-bold text-ink">
        감상과 피드백 <span className="text-base font-normal text-muted">{comments.length}</span>
      </h2>
      <div className="mt-5">
        {canComment ? (
          <CommentForm postId={postId} />
        ) : viewerId ? (
          <p className="rounded-lg bg-paper-deep px-4 py-3 text-sm text-muted">이 글에는 댓글을 남길 수 없습니다.</p>
        ) : (
          <p className="rounded-lg bg-paper-deep px-4 py-3 text-sm text-muted">
            <Link href={loginHref} className="font-medium text-accent underline underline-offset-4">
              로그인
            </Link>
            하면 감상을 남길 수 있어요.
          </p>
        )}
      </div>
      {comments.length === 0 ? (
        <EmptyState className="mt-6 py-8" title="아직 남겨진 감상이 없습니다." description="첫 번째로 이 글에 대한 생각을 나눠 주세요." />
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              isMine={c.authorId === viewerId}
              canDelete={c.authorId === viewerId || viewerIsAdmin}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
