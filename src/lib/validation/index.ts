import { z } from "zod";
import { TAG_MAX_COUNT, TAG_MAX_LENGTH } from "@/lib/text";

/** 클라이언트와 서버가 함께 사용하는 입력값 검증 스키마 */

export const POST_TITLE_MAX = 200;
export const POST_CONTENT_MAX = 200_000;
export const COMMENT_MAX = 3000;
export const HIGHLIGHT_TEXT_MAX = 1000;
export const HIGHLIGHT_CONTEXT_MAX = 64;
export const REPORT_REASON_MAX = 500;

export const uuidSchema = z.uuid({ message: "잘못된 식별자입니다." });

export const postInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해 주세요.")
    .max(POST_TITLE_MAX, `제목은 ${POST_TITLE_MAX}자 이내로 입력해 주세요.`),
  content: z
    .string()
    .refine((v) => v.trim().length > 0, "본문이 비어 있습니다.")
    .refine((v) => v.length <= POST_CONTENT_MAX, `본문은 ${POST_CONTENT_MAX.toLocaleString()}자 이내여야 합니다.`),
  tags: z
    .array(z.string().trim().min(1).max(TAG_MAX_LENGTH, `태그는 ${TAG_MAX_LENGTH}자 이내로 입력해 주세요.`))
    .max(TAG_MAX_COUNT, `태그는 최대 ${TAG_MAX_COUNT}개까지 등록할 수 있습니다.`)
    .default([]),
  visibility: z.enum(["public", "private"]),
  sourceFormat: z.enum(["docx", "markdown"]),
});
export type PostInput = z.input<typeof postInputSchema>;

export const commentInputSchema = z.object({
  postId: uuidSchema,
  content: z
    .string()
    .trim()
    .min(1, "내용을 입력해 주세요.")
    .max(COMMENT_MAX, `댓글은 ${COMMENT_MAX.toLocaleString()}자 이내로 작성해 주세요.`),
});

export const commentUpdateSchema = z.object({
  commentId: uuidSchema,
  content: commentInputSchema.shape.content,
});

export const highlightInputSchema = z
  .object({
    postId: uuidSchema,
    selectedText: z
      .string()
      .refine((v) => v.trim().length > 0, "선택한 문장이 비어 있습니다.")
      .refine((v) => v.length <= HIGHLIGHT_TEXT_MAX, `한 번에 ${HIGHLIGHT_TEXT_MAX}자까지 저장할 수 있습니다.`),
    startOffset: z.number().int().min(0),
    endOffset: z.number().int().min(1),
    contextBefore: z.string().max(HIGHLIGHT_CONTEXT_MAX).default(""),
    contextAfter: z.string().max(HIGHLIGHT_CONTEXT_MAX).default(""),
  })
  .refine((v) => v.endOffset > v.startOffset, { message: "잘못된 선택 범위입니다.", path: ["endOffset"] })
  .refine((v) => v.endOffset - v.startOffset === v.selectedText.length, {
    message: "선택 범위와 문장 길이가 일치하지 않습니다.",
    path: ["selectedText"],
  });
export type HighlightInput = z.input<typeof highlightInputSchema>;

export const reportInputSchema = z.object({
  postId: uuidSchema,
  commentId: uuidSchema.optional(),
  reason: z
    .string()
    .trim()
    .min(1, "신고 사유를 입력해 주세요.")
    .max(REPORT_REASON_MAX, `신고 사유는 ${REPORT_REASON_MAX}자 이내로 입력해 주세요.`),
});

export const SORT_OPTIONS = ["latest", "popular"] as const;
export const SEARCH_FIELDS = ["all", "title", "author", "tag"] as const;

export const searchParamsSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  field: z.enum(SEARCH_FIELDS).catch("all"),
  tag: z.string().trim().max(40).optional().catch(undefined),
  sort: z.enum(SORT_OPTIONS).catch("latest"),
  scope: z.enum(["public", "mine"]).catch("public"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(1, "표시 이름을 입력해 주세요.").max(30, "표시 이름은 30자 이내로 입력해 주세요."),
});

export const createUserSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해 주세요.").max(200),
  name: profileSchema.shape.name,
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(128),
  role: z.enum(["user", "admin"]).default("user"),
});

/** zod 오류를 필드별 첫 메시지로 변환 */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
