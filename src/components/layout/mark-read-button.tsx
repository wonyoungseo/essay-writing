"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationsReadAction } from "@/features/notifications/actions";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationsReadAction();
          router.refresh();
        })
      }
    >
      모두 읽음 처리
    </Button>
  );
}
