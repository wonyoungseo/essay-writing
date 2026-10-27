"use client";

import { Container } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export default function ExploreError({ reset }: { reset: () => void }) {
  return (
    <Container size="narrow">
      <div className="py-16">
        <Alert tone="error">
          글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={reset}>
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    </Container>
  );
}
