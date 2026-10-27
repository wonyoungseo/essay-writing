"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/session";
import { ok, toActionError, type ActionResult } from "@/lib/errors";
import { limitFor } from "@/lib/security/rate-limit";
import { createComment, deleteComment, updateComment } from "./service";

export async function createCommentAction(postId: string, content: string): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    limitFor("comment", viewer.id);
    await createComment(viewer, { postId, content });
    revalidatePath(`/posts/${postId}`);
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateCommentAction(commentId: string, content: string): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    limitFor("comment", viewer.id);
    await updateComment(viewer, { commentId, content });
    revalidatePath("/", "layout");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    const { postId } = await deleteComment(viewer, commentId);
    revalidatePath(`/posts/${postId}`);
    revalidatePath("/my/feedback");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}
