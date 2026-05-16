import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { cookies } from "next/headers"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "grass-erp-jwt-secret-key-change-in-production")
const TOKEN_NAME = "grass_auth_token"

export interface TokenPayload extends JWTPayload {
  userId: string
  email: string
  name: string
  roles: string[]
  permissions: string[]
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(payload: Omit<TokenPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  })
}

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_NAME)
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_NAME)
  return token?.value || null
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getAuthToken()
  if (!token) return null
  return verifyToken(token)
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user || !user.isActive) return null

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return null

  const roles = user.roles.map((ur) => ur.role.name)
  const permissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.key)
  )

  const payload: Omit<TokenPayload, "iat" | "exp"> = {
    userId: user.id,
    email: user.email,
    name: user.name,
    roles,
    permissions,
  }

  const token = await createToken(payload)
  await setAuthCookie(token)

  return { user, token, payload }
}

export async function hasPermission(permissionKey: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return user.permissions.includes(permissionKey)
}

export async function hasRole(roleName: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return user.roles.includes(roleName)
}

export function checkPermission(user: TokenPayload | null, permissionKey: string): boolean {
  if (!user) return false
  return user.permissions.includes(permissionKey)
}

export function checkRole(user: TokenPayload | null, roleName: string): boolean {
  if (!user) return false
  return user.roles.includes(roleName)
}

export async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      details: details as never,
      ipAddress,
    },
  })
}
