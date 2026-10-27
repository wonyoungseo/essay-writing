import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/layout/page-header";
import { PostEditor } from "@/components/posts/post-editor";
import { Alert } from "@/components/ui/feedback";
import { requireViewerOrRedirect } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getPostForEdit } from "@/features/posts/service";

export const metadata: Metadata = { title: "글 수정" };

export default async function EditPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const viewer = await requireViewerOrRedirect(`/posts/${postId}/edit`);
  let post;
  try {
    post = await getPostForEdit(viewer, postId);
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      return (
        <Container size="narrow">
          <div className="py-16">
            <Alert tone="error">본인이 작성한 글만 수정할 수 있습니다.</Alert>
          </div>
        </Container>
      );
    }
    notFound();
  }

  return (
    <Container size="narrow">
      <div className="pt-10">
        <PageHeader eyebrow="Edit" title="글 수정" description="제목, 태그, 공개 범위와 본문을 고칠 수 있습니다." />
        <PostEditor
          initial={{
            postId: post.id,
            title: post.title,
            content: post.content,
            html: post.html,
            tags: post.tags.map((t) => t.name),
            visibility: post.visibility,
            sourceFormat: post.sourceFormat,
          }}
        />
      </div>
    </Container>
  );
}
