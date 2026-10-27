"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/session";
import { ok, toActionError, type ActionResult } from "@/lib/errors";
import { limitFor } from "@/lib/security/rate-limit";
import { createReport, resolveReport } from "./service";

export async function createReportAction(input: { postId: string; commentId?: string; reason: string }): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    limitFor("report", viewer.id);
    await createReport(viewer, input);
    revalidatePath("/admin");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}

export async function resolveReportAction(reportId: string, status: "resolved" | "dismissed"): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    await resolveReport(viewer, reportId, status);
    revalidatePath("/admin");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}
