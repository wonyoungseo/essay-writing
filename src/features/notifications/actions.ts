"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/session";
import { ok, toActionError, type ActionResult } from "@/lib/errors";
import { markRead } from "./service";

export async function markNotificationsReadAction(notificationId?: string): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    await markRead(viewer, notificationId);
    revalidatePath("/", "layout");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}
