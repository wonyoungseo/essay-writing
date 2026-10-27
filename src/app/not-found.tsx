import { Container } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container size="narrow">
      <div className="py-24 text-center">
        <p className="text-sm font-medium text-accent">404</p>
        <p className="mt-2 font-serif text-2xl text-ink">찾으시는 글이 없거나 볼 수 없는 글입니다.</p>
        <p className="mt-3 text-sm text-muted">삭제되었거나, 작성자가 비공개로 전환했을 수 있습니다.</p>
        <div className="mt-8 flex justify-center gap-2">
          <LinkButton href="/explore">다른 글 둘러보기</LinkButton>
          <LinkButton href="/" variant="secondary">
            홈으로
          </LinkButton>
        </div>
      </div>
    </Container>
  );
}
