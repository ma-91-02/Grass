import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, logAudit } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError } from "@/lib/api-response"
import { z } from "zod"

const warehouseSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  address: z.string().optional().nullable(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: "asc" },
  })

  return successResponse(warehouses)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  try {
    const body = await request.json()
    const parsed = warehouseSchema.parse(body)

    const existingName = await prisma.warehouse.findUnique({ where: { name: parsed.name } })
    if (existingName) {
      return errorResponse("يوجد مخزن بهذا الاسم مسبقاً", 409)
    }

    const count = await prisma.warehouse.count()
    const code = `WH-${String(count + 1).padStart(4, "0")}`

    const warehouse = await prisma.warehouse.create({
      data: { ...parsed, code },
    })

    await logAudit(user.userId, "CREATE", "Warehouse", warehouse.id, { name: warehouse.name })

    return successResponse(warehouse, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "))
    }
    return errorResponse("فشل إنشاء المخزن", 500)
  }
}
