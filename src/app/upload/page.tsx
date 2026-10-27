import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/layout/page-header";
import { PostEditor } from "@/components/posts/post-editor";
import { requireViewerOrRedirect } from "@/lib/auth/session";

export const metadata: Metadata = { title: "글 올리기" };

export default async function UploadPage() {
  await requireViewerOrRedirect("/upload");
  return (
    <Container size="narrow">
      <div className="pt-10">
        <PageHeader eyebrow="Upload" title="글 올리기" description="작성해 둔 에세이 파일을 올리고, 제목과 태그를 정한 뒤 검토하고 게시하세요." />
        <PostEditor />
      </div>
    </Container>
  );
}
