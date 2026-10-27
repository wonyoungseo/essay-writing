import { AppError } from "@/lib/errors";

// Vercel 함수의 요청 본문 한도(약 4.5MB) 안에 들어가도록 4MB 로 제한한다.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4MB";
export const FILE_TOO_LARGE_MESSAGE = `파일이 너무 큽니다. ${MAX_UPLOAD_LABEL} 이하의 파일만 올릴 수 있습니다.`;
// 압축 해제 후 총 크기 상한 (zip bomb 방지)
export const MAX_DOCX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 3000;

export type UploadFormat = "docx" | "markdown";

const EXTENSIONS: Record<string, UploadFormat> = {
  ".docx": "docx",
  ".md": "markdown",
  ".markdown": "markdown",
};

// 브라우저/OS 가 보내는 MIME 은 신뢰할 수 없으므로 '명백히 다른 형식'만 거르는 용도로 쓴다.
const ALLOWED_MIME: Record<UploadFormat, string[]> = {
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
    "application/zip",
    "",
  ],
  markdown: ["text/markdown", "text/x-markdown", "text/plain", "application/octet-stream", ""],
};

export const ACCEPT_ATTRIBUTE = ".docx,.md,.markdown";

export function detectFormatByName(fileName: string): UploadFormat | null {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return null;
  return EXTENSIONS[lower.slice(dot)] ?? null;
}

const unsupported = (message: string) => new AppError("UNSUPPORTED_FILE", message);

/** 크기, 확장자, MIME 등 바이트를 읽기 전에 확인할 수 있는 항목 검증 (클라이언트/서버 공용) */
export function validateFileMeta(file: { name: string; size: number; type: string }): UploadFormat {
  const format = detectFormatByName(file.name);
  if (!format) throw unsupported("지원하지 않는 파일 형식입니다. .docx, .md, .markdown 파일만 올릴 수 있습니다.");
  if (file.size <= 0) throw unsupported("빈 파일입니다.");
  if (file.size > MAX_UPLOAD_BYTES) throw unsupported(FILE_TOO_LARGE_MESSAGE);
  const mime = (file.type || "").toLowerCase().split(";")[0].trim();
  if (!ALLOWED_MIME[format].includes(mime)) {
    throw unsupported("파일 내용 형식이 확장자와 일치하지 않습니다.");
  }
  return format;
}

const readU16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const readU32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

interface ZipSummary {
  names: string[];
  totalUncompressed: number;
}

/** ZIP 중앙 디렉터리를 읽어 항목 이름과 압축 해제 크기를 확인한다 (압축은 풀지 않음). */
export function inspectZip(bytes: Uint8Array): ZipSummary {
  if (bytes.length < 22 || readU32(bytes, 0) !== 0x04034b50) {
    throw unsupported("올바른 Word(.docx) 파일이 아닙니다.");
  }
  let eocd = -1;
  const minPos = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= minPos; i--) {
    if (readU32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw unsupported("손상된 Word(.docx) 파일입니다.");

  const entryCount = readU16(bytes, eocd + 10);
  const cdSize = readU32(bytes, eocd + 12);
  const cdOffset = readU32(bytes, eocd + 16);
  if (entryCount === 0xffff || cdOffset === 0xffffffff || entryCount > MAX_ZIP_ENTRIES) {
    throw unsupported("지원하지 않는 Word 파일 구조입니다.");
  }
  if (cdOffset + cdSize > bytes.length) throw unsupported("손상된 Word(.docx) 파일입니다.");

  const names: string[] = [];
  let total = 0;
  let p = cdOffset;
  const decoder = new TextDecoder();
  for (let i = 0; i < entryCount; i++) {
    if (p + 46 > bytes.length || readU32(bytes, p) !== 0x02014b50) {
      throw unsupported("손상된 Word(.docx) 파일입니다.");
    }
    const uncompressed = readU32(bytes, p + 24);
    const nameLen = readU16(bytes, p + 28);
    const extraLen = readU16(bytes, p + 30);
    const commentLen = readU16(bytes, p + 32);
    if (uncompressed === 0xffffffff) throw unsupported("지원하지 않는 Word 파일 구조입니다.");
    total += uncompressed;
    names.push(decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen)));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { names, totalUncompressed: total };
}

export function assertDocx(bytes: Uint8Array): void {
  const zip = inspectZip(bytes);
  if (!zip.names.includes("word/document.xml") || !zip.names.includes("[Content_Types].xml")) {
    throw unsupported("Word 문서(.docx)가 아닙니다. 다른 Office 파일이나 압축 파일은 올릴 수 없습니다.");
  }
  if (zip.totalUncompressed > MAX_DOCX_UNCOMPRESSED_BYTES) {
    throw unsupported("문서 내용이 너무 큽니다. 이미지가 많은 문서는 이미지를 줄여서 다시 올려 주세요.");
  }
}

/** UTF-8 텍스트인지 검증하고 디코딩한다. 바이너리 파일을 걸러낸다. */
export function decodeMarkdown(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw unsupported("Markdown 파일은 UTF-8 텍스트여야 합니다.");
  }
  if (text.includes("\u0000")) throw unsupported("텍스트 파일이 아닙니다.");
  return text;
}
