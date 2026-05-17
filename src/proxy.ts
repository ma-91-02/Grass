import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "grass-erp-jwt-secret-key-change-in-production",
);

const publicPaths = ["/auth/login", "/api/auth/login"];

interface JwtUserPayload {
  userId?: string;
  sub?: string;
  roles?: string[];
  [key: string]: unknown;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/")) {
    const token = request.cookies.get("grass_auth_token")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "غير مصرح" },
          { status: 401 },
        );
      }
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userPayload = payload as unknown as JwtUserPayload;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(
        "x-user-id",
        userPayload.userId || userPayload.sub || "",
      );
      requestHeaders.set(
        "x-user-roles",
        encodeURIComponent(JSON.stringify(userPayload.roles || [])),
      );
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "غير مصرح" },
          { status: 401 },
        );
      }
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
