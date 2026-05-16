import { NextResponse } from "next/server"

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function validationError(errors: Record<string, string[]>) {
  return NextResponse.json({ success: false, error: "Validation failed", errors }, { status: 400 })
}

export function unauthorizedError(message = "غير مصرح") {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbiddenError(message = "لا تملك الصلاحية") {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}

export function notFoundError(message = "غير موجود") {
  return NextResponse.json({ success: false, error: message }, { status: 404 })
}

export function conflictError(message = "موجود مسبقاً") {
  return NextResponse.json({ success: false, error: message }, { status: 409 })
}

export function serverError(error: unknown) {
  console.error("Internal server error:", error)
  return NextResponse.json({ success: false, error: "خطأ داخلي في الخادم" }, { status: 500 })
}
