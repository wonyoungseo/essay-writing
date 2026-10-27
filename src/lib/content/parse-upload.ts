import { AppError } from "@/lib/errors";
import { POST_CONTENT_MAX, POST_TITLE_MAX } from "@/lib/validation";
import { docxToMarkdown } from "./docx";
import { assertDocx, decodeMarkdown, validateFileMeta, type UploadFormat } from "./file-validation";
import { extractTitle, normalizeMarkdown, renderMarkdown } from "./markdown";

export interface ParsedUpload {
  format: UploadFormat;
  suggestedTitle: string;
  content: string;
  html: string;
  characterCount: number;
  warnings: string[];
}

/** 업로드 파일 검증 → 본문 추출 → 정규화. 데이터베이스에는 아무것도 쓰지 않는다. */
export async function parseUpload(file: { name: string; size: number; type: string; bytes: Uint8Array }): Promise<ParsedUpload> {
  const format = validateFileMeta(file);
  let raw: string;
  let warnings: string[] = [];

  if (format === "docx") {
    assertDocx(file.bytes);
    const converted = await docxToMarkdown(Buffer.from(file.bytes));
    raw = converted.markdown;
    warnings = converted.warnings;
  } else {
    raw = decodeMarkdown(file.bytes);
  }

  const normalized = normalizeMarkdown(raw);
  const { title, body } = extractTitle(normalized);
  const content = title ? body : normalized;
  if (!content.trim()) throw new AppError("UNSUPPORTED_FILE", "문서에서 본문을 찾지 못했습니다.");
  if (content.length > POST_CONTENT_MAX) {
    throw new AppError("UNSUPPORTED_FILE", `본문이 너무 깁니다. ${POST_CONTENT_MAX.toLocaleString()}자 이하로 줄여 주세요.`);
  }

  const fallbackTitle = file.name.replace(/\.(docx|md|markdown)$/i, "").trim();
  const rendered = renderMarkdown(content);
  return {
    format,
    suggestedTitle: (title ?? fallbackTitle).slice(0, POST_TITLE_MAX),
    content,
    html: rendered.html,
    characterCount: rendered.text.replace(/\s/g, "").length,
    warnings,
  };
}
