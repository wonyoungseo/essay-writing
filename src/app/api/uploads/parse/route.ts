import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth/session";
import { FILE_TOO_LARGE_MESSAGE, MAX_UPLOAD_BYTES } from "@/lib/content/file-validation";
import { parseUpload } from "@/lib/content/parse-upload";
import { AppError, toActionError } from "@/lib/errors";
import { limitFor } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UNSUPPORTED_FILE: 415,
  VALIDATION: 400,
  INTERNAL: 500,
};

/**
 * 업로드한 파일을 검증하고 본문을 추출해 미리보기 데이터를 돌려준다.
 * 이 단계에서는 아무것도 저장하지 않으며, 원본 파일도 보관하지 않는다.
 */
export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    limitFor("upload", viewer.id);

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      throw new AppError("UNSUPPORTED_FILE", FILE_TOO_LARGE_MESSAGE);
    }
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new AppError("VALIDATION", "업로드할 파일을 선택해 주세요.");
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError("UNSUPPORTED_FILE", FILE_TOO_LARGE_MESSAGE);
    }

    const parsed = await parseUpload({
      name: file.name,
      size: file.size,
      type: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return NextResponse.json({ ok: true, data: parsed });
  } catch (err) {
    const error = toActionError(err);
    return NextResponse.json(error, { status: STATUS[error.code] ?? 400 });
  }
}
