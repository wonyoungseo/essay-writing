"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireViewer } from "@/lib/auth/session";
import { ok, toActionError, type ActionResult } from "@/lib/errors";
import { createUserByAdmin, setUserBanned, setUserRole, updateProfile } from "./service";

export async function createUserAction(input: {
  email: string;
  name: string;
  password: string;
  role: "user" | "admin";
}): Promise<ActionResult<{ id: string }>> {
  try {
    const viewer = await requireViewer();
    const created = await createUserByAdmin(viewer, input, await headers());
    revalidatePath("/admin");
    return ok(created);
  } catch (err) {
    return toActionError(err);
  }
}

export async function setUserBannedAction(userId: string, banned: boolean): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    await setUserBanned(viewer, userId, banned, await headers());
    revalidatePath("/admin");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}

export async function setUserRoleAction(userId: string, role: "user" | "admin"): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    await setUserRole(viewer, userId, role, await headers());
    revalidatePath("/admin");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateProfileAction(input: { name: string }): Promise<ActionResult> {
  try {
    const viewer = await requireViewer();
    await updateProfile(viewer, input);
    revalidatePath("/", "layout");
    return ok(undefined);
  } catch (err) {
    return toActionError(err);
  }
}
