import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError } from "@/lib/api-response"
import { z } from "zod"

const packagingSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  piecesPerCarton: z.number().optional().default(0),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  const packagings = await prisma.productPackaging.findMany({
    orderBy: { name: "asc" },
  })

  return successResponse(packagings)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  try {
    const body = await request.json()
    const parsed = packagingSchema.parse(body)

    const existing = await prisma.productPackaging.findUnique({ where: { name: parsed.name } })
    if (existing) {
      return errorResponse("نوع التعبئة موجود مسبقاً", 409)
    }

    const packaging = await prisma.productPackaging.create({
      data: parsed,
    })

    return successResponse(packaging, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "))
    }
    return errorResponse("فشل إنشاء نوع التعبئة", 500)
  }
}
