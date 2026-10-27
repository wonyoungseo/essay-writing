/**
 * 하이라이트 위치 앵커링 (클라이언트/서버 공용 순수 함수)
 *
 * 저장: 선택한 텍스트 + 본문 textContent 기준 시작/끝 오프셋 + 앞뒤 문맥(각 최대 32자)
 * 복원: 1) 저장된 오프셋의 텍스트가 그대로면 사용
 *       2) 아니면 본문에서 같은 텍스트를 모두 찾아 앞뒤 문맥이 가장 잘 맞는 위치를 선택
 *       3) 찾지 못하면 null (복원 실패) → UI 에서 "본문이 바뀌어 위치를 찾을 수 없음"으로 안내
 */

export const CONTEXT_LENGTH = 32;

export interface HighlightAnchor {
  selectedText: string;
  startOffset: number;
  endOffset: number;
  contextBefore: string;
  contextAfter: string;
}

export interface ResolvedRange {
  start: number;
  end: number;
  /** exact: 저장된 위치 그대로, relocated: 본문 변경 후 문맥으로 재배치 */
  status: "exact" | "relocated";
}

export function buildAnchor(fullText: string, start: number, end: number): HighlightAnchor {
  return {
    selectedText: fullText.slice(start, end),
    startOffset: start,
    endOffset: end,
    contextBefore: fullText.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    contextAfter: fullText.slice(end, end + CONTEXT_LENGTH),
  };
}

/** 선택 범위의 앞뒤 공백을 잘라낸 범위를 돌려준다. 공백만 선택했다면 null */
export function trimRange(fullText: string, start: number, end: number): { start: number; end: number } | null {
  let s = Math.max(0, start);
  let e = Math.min(fullText.length, end);
  while (s < e && /\s/.test(fullText[s])) s++;
  while (e > s && /\s/.test(fullText[e - 1])) e--;
  return e > s ? { start: s, end: e } : null;
}

function commonSuffixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function commonPrefixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

export function resolveAnchor(fullText: string, anchor: HighlightAnchor): ResolvedRange | null {
  const { selectedText, startOffset, endOffset } = anchor;
  if (!selectedText) return null;

  if (fullText.slice(startOffset, endOffset) === selectedText) {
    return { start: startOffset, end: endOffset, status: "exact" };
  }

  let best: { start: number; score: number; distance: number } | null = null;
  for (let i = fullText.indexOf(selectedText); i !== -1; i = fullText.indexOf(selectedText, i + 1)) {
    const before = fullText.slice(Math.max(0, i - CONTEXT_LENGTH), i);
    const after = fullText.slice(i + selectedText.length, i + selectedText.length + CONTEXT_LENGTH);
    const score = commonSuffixLength(before, anchor.contextBefore) + commonPrefixLength(after, anchor.contextAfter);
    const distance = Math.abs(i - startOffset);
    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { start: i, score, distance };
    }
  }
  if (!best) return null;
  return { start: best.start, end: best.start + selectedText.length, status: "relocated" };
}

/** 겹치는 범위를 병합해 그리기 순서대로 정렬 (CSS Highlight 등록용) */
export function mergeRanges(ranges: { start: number; end: number }[]): { start: number; end: number }[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else out.push({ ...r });
  }
  return out;
}
