import { describe, expect, it } from "vitest";
import { extractTitle, normalizeMarkdown, renderMarkdown } from "@/lib/content/markdown";

describe("renderMarkdown 보안", () => {
  it("원시 HTML 과 script 태그를 제거한다", () => {
    const { html } = renderMarkdown('안녕하세요\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<div onclick="x()">클릭</div>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/onclick/i);
    expect(html).toContain("안녕하세요");
  });
  it("javascript:, data: 링크를 제거한다", () => {
    const { html } = renderMarkdown("[a](javascript:alert(1)) [b](data:text/html,<script>) [c](https://example.com)");
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/data:text/i);
    expect(html).toContain('href="https://example.com"');
    expect(html).toMatch(/rel="nofollow ugc noopener noreferrer"/);
  });
  it("http 이미지는 제거하고 https 이미지만 허용한다", () => {
    expect(renderMarkdown("![x](http://insecure.example/a.png)").html).not.toContain("insecure.example");
    expect(renderMarkdown("![x](https://secure.example/a.png)").html).toContain('src="https://secure.example/a.png"');
  });
});

describe("renderMarkdown 구조", () => {
  it("제목, 강조, 목록, 인용, 표(GFM)를 보존한다", () => {
    const { html } = renderMarkdown("## 소제목\n\n**굵게** *기울임*\n\n- 하나\n- 둘\n\n> 인용\n\n| a | b |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain("<h2>소제목</h2>");
    expect(html).toContain("<strong>굵게</strong>");
    expect(html).toContain("<em>기울임</em>");
    expect(html).toContain("<li>하나</li>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<table>");
  });
  it("text 는 HTML 의 텍스트 노드를 이어 붙인 값이다", () => {
    const { text } = renderMarkdown("첫 문단 **강조** 끝\n\n둘째 문단 &amp; 기호");
    expect(text).toBe("첫 문단 강조 끝\n둘째 문단 & 기호");
  });
});

describe("extractTitle / normalizeMarkdown", () => {
  it("첫 줄의 H1 을 제목으로 분리한다", () => {
    expect(extractTitle("\n# 나의 에세이\n\n본문")).toEqual({ title: "나의 에세이", body: "본문" });
  });
  it("H1 이 없으면 제목은 null", () => {
    expect(extractTitle("## 소제목\n본문").title).toBeNull();
  });
  it("BOM 과 CRLF 를 정리한다", () => {
    expect(normalizeMarkdown("﻿가\r\n나\r\n\r\n\r\n\r\n\r\n다")).toBe("가\n나\n\n\n다");
  });
});
