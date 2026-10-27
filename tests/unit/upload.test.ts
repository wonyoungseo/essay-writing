import { describe, expect, it } from "vitest";
import { assertDocx, decodeMarkdown, MAX_UPLOAD_BYTES, validateFileMeta } from "@/lib/content/file-validation";
import { parseUpload } from "@/lib/content/parse-upload";
import { makeDocx, makeZip } from "../fixtures/make-docx";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("validateFileMeta", () => {
  it("지원 형식을 판별한다", () => {
    expect(validateFileMeta({ name: "a.docx", size: 10, type: DOCX_MIME })).toBe("docx");
    expect(validateFileMeta({ name: "a.MD", size: 10, type: "text/markdown" })).toBe("markdown");
    expect(validateFileMeta({ name: "a.markdown", size: 10, type: "" })).toBe("markdown");
  });
  it("지원하지 않는 확장자를 거부한다", () => {
    for (const name of ["a.pdf", "a.doc", "a.txt", "a.docx.exe", "noext"]) {
      expect(() => validateFileMeta({ name, size: 10, type: "" })).toThrow(/지원하지 않는/);
    }
  });
  it("크기 제한과 빈 파일을 검사한다", () => {
    expect(() => validateFileMeta({ name: "a.md", size: MAX_UPLOAD_BYTES + 1, type: "" })).toThrow(/4MB/);
    expect(() => validateFileMeta({ name: "a.md", size: 0, type: "" })).toThrow(/빈 파일/);
  });
  it("확장자와 MIME 이 명백히 다르면 거부한다", () => {
    expect(() => validateFileMeta({ name: "a.md", size: 10, type: "image/png" })).toThrow(/일치하지/);
    expect(() => validateFileMeta({ name: "a.docx", size: 10, type: "text/html" })).toThrow(/일치하지/);
  });
});

describe("실제 내용 검증", () => {
  it("확장자만 .docx 인 텍스트 파일을 거부한다", () => {
    expect(() => assertDocx(new TextEncoder().encode("hello world, not a zip file"))).toThrow(/Word/);
  });
  it("Word 문서가 아닌 zip 을 거부한다", async () => {
    const zip = await makeZip({ "hello.txt": "hi" });
    expect(() => assertDocx(zip)).toThrow(/Word 문서/);
  });
  it("압축 해제 크기가 큰 문서(zip bomb)를 거부한다", async () => {
    const zip = await makeZip({ "[Content_Types].xml": "<x/>", "word/document.xml": "a".repeat(41 * 1024 * 1024) });
    expect(zip.length).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(() => assertDocx(zip)).toThrow(/너무 큽니다/);
  });
  it("UTF-8 이 아닌 Markdown 을 거부한다", () => {
    expect(() => decodeMarkdown(new Uint8Array([0xff, 0xfe, 0x00, 0x41]))).toThrow(/UTF-8/);
    expect(() => decodeMarkdown(new TextEncoder().encode("a\u0000b"))).toThrow(/텍스트/);
  });
});

describe("parseUpload", () => {
  it("Markdown 에서 제목과 본문을 분리하고 위험한 HTML 을 제거한다", async () => {
    const bytes = new TextEncoder().encode("# 봄날의 산책\n\n첫 문단입니다.\n\n<script>alert(1)</script>\n\n- 목록");
    const parsed = await parseUpload({ name: "walk.md", size: bytes.length, type: "text/markdown", bytes });
    expect(parsed.suggestedTitle).toBe("봄날의 산책");
    expect(parsed.content.startsWith("첫 문단입니다.")).toBe(true);
    expect(parsed.html).not.toContain("<script");
    expect(parsed.html).toContain("<li>목록</li>");
  });

  it("제목이 없으면 파일 이름을 제목으로 제안한다", async () => {
    const bytes = new TextEncoder().encode("그냥 본문");
    const parsed = await parseUpload({ name: "나의 글.markdown", size: bytes.length, type: "", bytes });
    expect(parsed.suggestedTitle).toBe("나의 글");
  });

  it("Word 문서의 제목/소제목/문단/굵게를 추출한다", async () => {
    const bytes = await makeDocx([
      { text: "겨울 바다", style: "Title" },
      { text: "첫 번째 문단입니다." },
      { text: "소제목", style: "Heading2" },
      { text: "굵은 문장", bold: true },
    ]);
    const parsed = await parseUpload({ name: "sea.docx", size: bytes.length, type: DOCX_MIME, bytes });
    expect(parsed.format).toBe("docx");
    expect(parsed.suggestedTitle).toBe("겨울 바다");
    expect(parsed.content).toContain("첫 번째 문단입니다.");
    expect(parsed.content).toContain("## 소제목");
    expect(parsed.content).toContain("**굵은 문장**");
    expect(parsed.html).toContain("<h2>소제목</h2>");
  });

  it("본문이 비어 있는 문서를 거부한다", async () => {
    const bytes = new TextEncoder().encode("# 제목만 있음\n\n");
    await expect(parseUpload({ name: "a.md", size: bytes.length, type: "", bytes })).rejects.toThrow(/본문/);
  });
});
