"use client";

import { useEffect } from "react";
import { Container } from "@/components/layout/page-header";
import { Button, LinkButton } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container size="narrow">
      <div className="py-24 text-center">
        <p className="font-serif text-2xl text-ink">페이지를 불러오지 못했습니다.</p>
        <p className="mt-3 text-sm text-muted">일시적인 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={reset}>다시 시도</Button>
          <LinkButton href="/" variant="secondary">
            홈으로
          </LinkButton>
        </div>
      </div>
    </Container>
  );
}
