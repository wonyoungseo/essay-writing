import type { Element, Root, RootContent } from "hast";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * Markdown → 안전한 HTML 변환.
 * - remark-rehype 에 allowDangerousHtml 을 주지 않으므로 Markdown 안의 원시 HTML 은 모두 제거된다.
 * - rehype-sanitize(GitHub 기준 스키마)로 한 번 더 정화한다. (javascript: 링크, on* 속성 등 차단)
 * - 링크에는 rel="nofollow ugc noopener noreferrer" 를 붙인다.
 */

const schema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["https"],
  },
};

function rehypeSafeLinks() {
  return (tree: Root) => {
    const visit = (node: Root | RootContent) => {
      if (node.type === "element") {
        const el = node as Element;
        if (el.tagName === "a") {
          el.properties = { ...el.properties, rel: ["nofollow", "ugc", "noopener", "noreferrer"] };
          const href = String(el.properties.href ?? "");
          if (/^https?:/i.test(href)) el.properties.target = "_blank";
        }
        if (el.tagName === "img") {
          el.properties = { ...el.properties, loading: "lazy", referrerPolicy: "no-referrer" };
        }
      }
      if ("children" in node) node.children.forEach(visit);
    };
    visit(tree);
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeSafeLinks)
  .use(rehypeStringify);

/**
 * 렌더링된 HTML 의 textContent 와 동일한 문자열을 만든다.
 * 하이라이트 오프셋은 브라우저에서 본문 컨테이너의 textContent 기준으로 계산되므로
 * 서버의 content_text 와 반드시 같은 규칙이어야 한다.
 */
function hastText(node: Root | RootContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(hastText).join("");
  return "";
}

export interface RenderedContent {
  html: string;
  text: string;
}

export function renderMarkdown(markdown: string): RenderedContent {
  const mdast = processor.parse(markdown);
  const hast = processor.runSync(mdast) as Root;
  const html = processor.stringify(hast);
  return { html: String(html), text: hastText(hast) };
}

/** 첫 줄이 '# 제목' 이면 제목으로 분리한다. */
export function extractTitle(markdown: string): { title: string | null; body: string } {
  const lines = markdown.replace(/^﻿/, "").split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim() !== "");
  if (first === -1) return { title: null, body: "" };
  const match = /^#\s+(.+?)\s*#*\s*$/.exec(lines[first].trim());
  if (!match) return { title: null, body: lines.join("\n").trim() };
  const body = lines
    .slice(first + 1)
    .join("\n")
    .trim();
  return { title: match[1].trim(), body };
}

/** 줄바꿈/BOM 정규화 */
export function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
