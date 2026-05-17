import { NextRequest } from "next/server";
import { removeAuthCookie, getCurrentUser, recordAuthAudit } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (user) {
    await recordAuthAudit({
      userId: user.userId,
      action: "LOGOUT",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });
  }
  await removeAuthCookie();
  return successResponse({ message: "تم تسجيل الخروج" });
}
