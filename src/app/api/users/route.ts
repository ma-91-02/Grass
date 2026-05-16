import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, hashPassword, logAudit } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError } from "@/lib/api-response"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  const users = await prisma.user.findMany({
    include: {
      roles: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    phone: u.phone,
    roles: u.roles.map((r) => r.role.name),
    createdAt: u.createdAt.toISOString(),
  }))

  return successResponse(data)
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return unauthorizedError()

  try {
    const body = await request.json()
    const { name, email, password, phone, roleIds } = body

    if (!name || !email || !password) {
      return errorResponse("الاسم والبريد الإلكتروني وكلمة المرور مطلوبون")
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return errorResponse("البريد الإلكتروني موجود مسبقاً", 409)
    }

    const passwordHash = await hashPassword(password)

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        createdBy: currentUser.userId,
        roles: roleIds?.length
          ? { create: roleIds.map((roleId: string) => ({ roleId })) }
          : undefined,
      },
      include: { roles: { include: { role: true } } },
    })

    await logAudit(currentUser.userId, "CREATE", "User", newUser.id, { name, email })

    return successResponse({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      isActive: newUser.isActive,
      phone: newUser.phone,
      roles: newUser.roles.map((r) => r.role.name),
      createdAt: newUser.createdAt.toISOString(),
    }, 201)
  } catch (error) {
    console.error("Create user error:", error)
    return errorResponse("فشل إنشاء المستخدم", 500)
  }
}
