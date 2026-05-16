import { removeAuthCookie } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  await removeAuthCookie();
  return successResponse({ message: "تم تسجيل الخروج" });
}
