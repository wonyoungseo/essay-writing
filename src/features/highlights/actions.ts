"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/session";
import { ok, toActionError, type ActionResult } from "@/lib/errors";
import { limitFor } from "@/lib/security/rate-limit";
import type { HighlightInput } from "@/lib/validation";
import { createHighlight, deleteHighlight, type HighlightView } from "./service";

export async function createHighlightAction(
  input: HighlightInput,
): Promise<ActionResult<{ highlight: HighlightView; duplicate: boolean }>> {
  try {
    const viewer = await requireViewer();
    limitFor("highlight", viewer.id);
    const result = await createHighlight(viewer, input);
    revalidatePath("/my/highlights");
    return ok(result);
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteHighlightAction(highlightId: string): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    const { postId } = await deleteHighlight(viewer, highlightId);
    revalidatePath("/my/highlights");
    revalidatePath(`/posts/${postId}`);
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}
