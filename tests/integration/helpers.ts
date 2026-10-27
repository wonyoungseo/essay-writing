import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Viewer } from "@/lib/permissions";
import { createPost } from "@/features/posts/service";
import type { PostInput } from "@/lib/validation";

export async function resetDb() {
  await db.execute(
    sql`truncate table reports, notifications, highlights, comments, post_tags, tags, posts, sessions, accounts, verifications, users restart identity cascade`,
  );
}

export async function makeUser(name: string, role: "user" | "admin" = "user"): Promise<Viewer> {
  const id = randomUUID();
  const email = `${name.toLowerCase()}-${id.slice(0, 6)}@test.local`;
  await db.insert(users).values({ id, name, email, role });
  return { id, name, email, role, banned: false };
}

export const SAMPLE_BODY = `첫 번째 문단입니다. 바람이 분다.

두 번째 문단에는 **강조된 문장**이 있습니다. 바람이 분다.

- 목록 하나
- 목록 둘`;

export async function makePost(author: Viewer, patch: Partial<PostInput> = {}) {
  return createPost(author, {
    title: "테스트 에세이",
    content: SAMPLE_BODY,
    tags: ["일상"],
    visibility: "public",
    sourceFormat: "markdown",
    ...patch,
  });
}

export async function expectAppError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (err) {
    const e = err as { code?: string; name?: string };
    if (e.name === "AppError" && e.code === code) return;
    throw new Error(`expected AppError(${code}) but got ${e.name}(${e.code}): ${String(err)}`);
  }
  throw new Error(`expected AppError(${code}) but promise resolved`);
}
