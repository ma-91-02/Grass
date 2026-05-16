import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "grass-erp-jwt-secret-key-change-in-production")

const protectedPaths = ["/dashboard"]
const publicPaths = ["/auth/login"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get("grass_auth_token")?.value

    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  return NextResponse.next()
}

export default proxy

export const config = {
  matcher: ["/dashboard/:path*"],
}
