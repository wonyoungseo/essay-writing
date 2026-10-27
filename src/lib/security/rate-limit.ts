import { AppError } from "@/lib/errors";

/**
 * 단일 인스턴스용 메모리 기반 고정 창(rate limit).
 * 다중 인스턴스 배포 시에는 Redis 등 공유 저장소 기반으로 교체해야 한다(docs/decisions.md).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  if (process.env.DISABLE_RATE_LIMIT === "1") return;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new AppError("RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export const LIMITS = {
  upload: { limit: 10, windowMs: 60_000 },
  post: { limit: 10, windowMs: 60_000 },
  comment: { limit: 10, windowMs: 60_000 },
  highlight: { limit: 60, windowMs: 60_000 },
  report: { limit: 10, windowMs: 60_000 },
} as const;

export function limitFor(action: keyof typeof LIMITS, userId: string) {
  const { limit, windowMs } = LIMITS[action];
  rateLimit(`${action}:${userId}`, limit, windowMs);
}
