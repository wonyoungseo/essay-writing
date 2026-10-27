import mammoth from "mammoth";
import TurndownService from "turndown";
import { AppError } from "@/lib/errors";

/**
 * Word(.docx) → Markdown.
 * mammoth 로 의미 기반 HTML(제목, 문단, 목록, 강조)을 뽑고 turndown 으로 Markdown 으로 바꾼다.
 * 이미지는 MVP 범위에서 제외한다(docs/decisions.md D-05).
 */

const styleMap = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='제목'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
];

function createTurndown() {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  td.remove(["img", "script", "style"]);
  return td;
}

export async function docxToMarkdown(buffer: Buffer): Promise<{ markdown: string; warnings: string[] }> {
  try {
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap,
        convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
      },
    );
    const markdown = createTurndown().turndown(result.value);
    const warnings = result.messages
      .filter((m) => m.type === "warning")
      .map((m) => m.message)
      .slice(0, 5);
    return { markdown, warnings };
  } catch (err) {
    console.error("[docx] parse failed", err);
    throw new AppError("UNSUPPORTED_FILE", "Word 문서를 읽지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요.");
  }
}
