"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePostAction, setPostHiddenAction } from "@/features/posts/actions";
import { LinkButton, Button } from "@/components/ui/button";

export function PostOwnerActions({
  postId,
  canEdit,
  canDelete,
  isAdminViewer,
  hidden,
}: {
  postId: string;
  canEdit: boolean;
  canDelete: boolean;
  isAdminViewer: boolean;
  hidden: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <LinkButton href={`/posts/${postId}/edit`} variant="secondary" size="sm">
          수정
        </LinkButton>
      )}
      {isAdminViewer && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await setPostHiddenAction(postId, !hidden);
              if (!res.ok) setError(res.error);
              else router.refresh();
            })
          }
        >
          {hidden ? "숨김 해제" : "관리자 숨김"}
        </Button>
      )}
      {canDelete && (
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("이 글을 삭제할까요? 댓글, 하이라이트도 함께 삭제되며 되돌릴 수 없습니다.")) return;
            startTransition(async () => {
              const res = await deletePostAction(postId);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              router.push("/my?deleted=1");
              router.refresh();
            });
          }}
        >
          삭제
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
