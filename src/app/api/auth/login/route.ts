import { NextRequest } from "next/server";
import {
  authenticateUser,
  recordAuthAudit,
  checkRateLimit,
  loginSchema,
} from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return successResponse(
        { error: "محاولات تسجيل دخول كثيرة. حاول لاحقاً." },
        429,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return successResponse({ error: "بيانات الطلب غير صحيحة" }, 400);
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        Object.values(fieldErrors).flat()[0] || "بيانات غير صحيحة";
      return successResponse({ error: firstError }, 400);
    }

    const { email, password } = parsed.data;

    const result = await authenticateUser(email, password);

    if (!result) {
      await recordAuthAudit({
        email,
        action: "LOGIN_FAILED",
        ipAddress: ip === "unknown" ? undefined : ip,
        userAgent,
      });
      return successResponse({ error: "بيانات الدخول غير صحيحة" }, 401);
    }

    await recordAuthAudit({
      userId: result.user.id,
      email: result.user.email,
      action: "LOGIN_SUCCESS",
      ipAddress: ip === "unknown" ? undefined : ip,
      userAgent,
    });

    return successResponse({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        roles: result.payload.roles,
      },
      token: result.token,
    });
  } catch {
    return successResponse({ error: "خطأ في تسجيل الدخول" }, 500);
  }
}
