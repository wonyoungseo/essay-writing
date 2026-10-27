"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/session";
import { renderMarkdown } from "@/lib/content/markdown";
import { ok, toActionError, type ActionResult } from "@/lib/errors";
import { limitFor } from "@/lib/security/rate-limit";
import { POST_CONTENT_MAX, type PostInput } from "@/lib/validation";
import { createPost, deletePost, setPostHidden, updatePost } from "./service";

export async function createPostAction(input: PostInput): Promise<ActionResult<{ id: string }>> {
  try {
    const viewer = await requireViewer();
    limitFor("post", viewer.id);
    const created = await createPost(viewer, input);
    revalidatePath("/", "layout");
    return ok(created);
  } catch (err) {
    return toActionError(err);
  }
}

export async function updatePostAction(postId: string, input: PostInput): Promise<ActionResult<{ id: string }>> {
  try {
    const viewer = await requireViewer();
    limitFor("post", viewer.id);
    const updated = await updatePost(viewer, postId, input);
    revalidatePath("/", "layout");
    return ok(updated);
  } catch (err) {
    return toActionError(err);
  }
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    await deletePost(viewer, postId);
    revalidatePath("/", "layout");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}

export async function setPostHiddenAction(postId: string, hidden: boolean): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    await setPostHidden(viewer, postId, hidden);
    revalidatePath("/", "layout");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}

/** 편집 중인 Markdown 의 미리보기 (저장하지 않음) */
export async function previewMarkdownAction(markdown: string): Promise<ActionResult<{ html: string }>> {
  try {
    await requireViewer();
    return ok({ html: renderMarkdown(markdown.slice(0, POST_CONTENT_MAX)).html });
  } catch (err) {
    return toActionError(err);
  }
}
