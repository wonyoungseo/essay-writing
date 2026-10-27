export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNSUPPORTED_FILE"
  | "INTERNAL";

/** 사용자에게 그대로 보여줄 수 있는 메시지를 가진 도메인 오류 */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** 예상하지 못한 오류는 내부 정보를 숨기고 일반 메시지로 변환한다. */
export function toActionError(err: unknown): Extract<ActionResult<never>, { ok: false }> {
  if (err instanceof AppError) {
    return { ok: false, code: err.code, error: err.message, fieldErrors: err.fieldErrors };
  }
  console.error("[unexpected]", err);
  return { ok: false, code: "INTERNAL", error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
}

export const unauthenticated = () => new AppError("UNAUTHENTICATED", "로그인이 필요합니다.");
export const forbidden = (message = "이 작업을 수행할 권한이 없습니다.") => new AppError("FORBIDDEN", message);
export const notFound = (message = "요청한 내용을 찾을 수 없습니다.") => new AppError("NOT_FOUND", message);
