/** LIKE/ILIKE 패턴에서 와일드카드로 해석되는 문자를 이스케이프한다. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** 연속 공백을 하나로 줄이고 앞뒤 공백을 제거한다. */
export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function makeExcerpt(plainText: string, maxLength = 160): string {
  const text = collapseWhitespace(plainText);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export const TAG_MAX_LENGTH = 20;
export const TAG_MAX_COUNT = 5;

/** 태그 표시명 정규화: '#' 제거, 공백 정리 */
export function normalizeTagName(raw: string): string {
  return collapseWhitespace(raw.replace(/^#+/, "")).slice(0, TAG_MAX_LENGTH);
}

/** 태그 slug: 소문자, 공백은 하이픈. 한글은 그대로 유지한다. */
export function tagSlug(name: string): string {
  return normalizeTagName(name)
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 중복(slug 기준)과 빈 값을 제거한 태그 목록 */
export function normalizeTags(raw: string[]): { name: string; slug: string }[] {
  const seen = new Set<string>();
  const out: { name: string; slug: string }[] = [];
  for (const item of raw) {
    const name = normalizeTagName(item);
    const slug = tagSlug(name);
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ name, slug });
  }
  return out;
}
