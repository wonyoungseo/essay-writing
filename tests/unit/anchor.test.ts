import { describe, expect, it } from "vitest";
import { buildAnchor, mergeRanges, resolveAnchor, trimRange } from "@/features/highlights/anchor";

const text = "바람이 분다. 살아야겠다. 바람이 분다. 다시 바람이 분다.";

describe("하이라이트 앵커", () => {
  it("본문이 그대로면 저장된 위치를 그대로 쓴다", () => {
    const anchor = buildAnchor(text, 8, 14);
    expect(anchor.selectedText).toBe("살아야겠다.");
    expect(resolveAnchor(text, anchor)).toEqual({ start: 8, end: 14, status: "exact" });
  });

  it("앞부분에 글이 추가되면 문맥으로 위치를 다시 찾는다", () => {
    const anchor = buildAnchor(text, 8, 14);
    const edited = `새로 추가된 첫 문장. ${text}`;
    const r = resolveAnchor(edited, anchor);
    expect(r?.status).toBe("relocated");
    expect(edited.slice(r!.start, r!.end)).toBe("살아야겠다.");
  });

  it("같은 문장이 여러 번 나오면 앞뒤 문맥이 맞는 위치를 고른다", () => {
    const second = text.indexOf("바람이 분다.", 10);
    const anchor = buildAnchor(text, second, second + 7);
    const edited = `머리말. ${text}`;
    const r = resolveAnchor(edited, anchor)!;
    expect(r.start).toBe(edited.indexOf("바람이 분다.", 15));
  });

  it("문장이 삭제되면 null (복원 실패)", () => {
    const anchor = buildAnchor(text, 8, 14);
    expect(resolveAnchor("완전히 다른 본문", anchor)).toBeNull();
  });

  it("범위를 벗어난 오프셋도 안전하게 처리한다", () => {
    expect(resolveAnchor("짧음", { selectedText: "없는 문장", startOffset: 500, endOffset: 505, contextBefore: "", contextAfter: "" })).toBeNull();
  });

  it("선택 범위 앞뒤의 공백을 잘라낸다", () => {
    expect(trimRange("  가나다  ", 0, 7)).toEqual({ start: 2, end: 5 });
    expect(trimRange("   ", 0, 3)).toBeNull();
  });

  it("겹치는 범위를 병합한다", () => {
    expect(mergeRanges([{ start: 5, end: 9 }, { start: 0, end: 3 }, { start: 2, end: 4 }, { start: 8, end: 12 }])).toEqual([
      { start: 0, end: 4 },
      { start: 5, end: 12 },
    ]);
  });
});
