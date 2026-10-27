import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "소개" };

export default function AboutPage() {
  return (
    <Container size="reading">
      <div className="pt-10">
        <PageHeader eyebrow="About" title="에세이 글쓰기" description="서로의 글을 읽고, 마음에 남은 문장을 모으는 곳" />
        <div className="essay-body">
          <p>
          </p>
          <h2 id="guide">이용 안내</h2>
          <ul>
            <li>계정은 운영자가 초대하는 방식으로만 만들어집니다. 공개된 글은 로그인 없이도 읽을 수 있습니다.</li>
            <li>글은 Word(.docx) 또는 Markdown(.md) 파일로 올립니다. 올린 뒤에도 본문을 직접 고칠 수 있습니다.</li>
            <li>본문에서 문장을 선택해 하이라이트로 저장하면 ‘내 하이라이트’에서 다시 볼 수 있습니다. 하이라이트는 나만 볼 수 있습니다.</li>
            <li>부적절한 글이나 댓글은 신고할 수 있으며, 운영자가 확인한 뒤 숨기거나 삭제합니다.</li>
          </ul>
          <h2 id="privacy">개인정보 처리방침</h2>
          <ul>
            <li>수집 항목: 이메일(로그인용), 표시 이름, 작성한 글·댓글·하이라이트, 로그인 세션 정보(IP, 브라우저 정보).</li>
            <li>원본 업로드 파일은 본문 추출 후 저장하지 않습니다.</li>
            <li>비공개 글과 하이라이트는 본인 외에는 볼 수 없습니다. 운영자도 비공개 글의 본문은 열람하지 않습니다.</li>
            <li>이메일·푸시 알림은 보내지 않습니다. 알림은 서비스 안에서만 표시됩니다.</li>
            <li>계정 삭제를 요청하면 작성한 글과 활동 기록이 함께 삭제됩니다.</li>
          </ul>
        </div>
      </div>
    </Container>
  );
}
