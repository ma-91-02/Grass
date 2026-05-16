import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, logAudit } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError, notFoundError } from "@/lib/api-response"
import { z } from "zod"

const warehouseSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").optional(),
  code: z.string().min(1, "الكود مطلوب").optional(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  const { id } = await params
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
  })

  if (!warehouse) return notFoundError()

  return successResponse(warehouse)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return unauthorizedError()

  const { id } = await params
  const existing = await prisma.warehouse.findUnique({ where: { id } })
  if (!existing) return notFoundError()

  try {
    const body = await request.json()
    const parsed = warehouseSchema.parse(body)

    if (parsed.name || parsed.code) {
      const duplicate = await prisma.warehouse.findFirst({
        where: {
          OR: [
            ...(parsed.name ? [{ name: parsed.name }] : []),
            ...(parsed.code ? [{ code: parsed.code }] : []),
          ],
          NOT: { id },
        },
      })
      if (duplicate) {
        return errorResponse("مخزن آخر بنفس الاسم أو الكود موجود مسبقاً", 409)
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: parsed,
    })

    await logAudit(currentUser.userId, "UPDATE", "Warehouse", id, { name: warehouse.name })

    return successResponse(warehouse)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "))
    }
    return errorResponse("فشل تحديث المخزن", 500)
  }
}
