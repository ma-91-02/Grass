import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

const TOKEN_NAME = "grass_auth_token";
const SESSION_DURATION_SECONDS = 60 * 60 * 24;

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface AuthContext {
  user: TokenPayload;
  token: string;
}

export async function createToken(
  payload: Omit<TokenPayload, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: TokenPayload): boolean {
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export async function removeSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME);
  return token?.value || null;
}

export async function getSessionUser(): Promise<TokenPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return verifyToken(token);
}

export async function validateSession(): Promise<AuthContext | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  if (isTokenExpired(payload)) return null;
  return { user: payload, token };
}

export async function validateSessionWithDb(): Promise<AuthContext | null> {
  const session = await validateSession();
  if (!session) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.userId, isActive: true },
    });
    if (!user) return null;
    return session;
  } catch {
    return null;
  }
}
