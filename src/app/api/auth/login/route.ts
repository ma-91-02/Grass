import { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("البريد الإلكتروني وكلمة المرور مطلوبان");
    }

    const result = await authenticateUser(email, password);

    if (!result) {
      return errorResponse("بيانات الدخول غير صحيحة", 401);
    }

    return successResponse({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        roles: result.payload.roles,
      },
      token: result.token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("خطأ في تسجيل الدخول", 500);
  }
}
