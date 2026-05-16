import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError } from "@/lib/api-response"
import { z } from "zod"

const rateSchema = z.object({
  usdToIqd: z.number().min(1, "سعر الصرف مطلوب"),
  note: z.string().optional().nullable(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  const rates = await prisma.exchangeRate.findMany({
    orderBy: { date: "desc" },
    take: 50,
  })

  return successResponse(rates)
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return unauthorizedError()

  try {
    const body = await request.json()
    const parsed = rateSchema.parse(body)

    const rate = await prisma.exchangeRate.create({
      data: {
        usdToIqd: parsed.usdToIqd,
        note: parsed.note,
        createdById: currentUser.userId,
      },
    })

    return successResponse(rate, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "))
    }
    return errorResponse("فشل إنشاء سعر الصرف", 500)
  }
}
