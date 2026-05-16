import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, logAudit } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError } from "@/lib/api-response"
import { z } from "zod"

const productSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  packagingId: z.string().optional().nullable(),
  piecesPerCarton: z.number().optional().default(0),
  unit: z.string().optional().default("قطعة"),
  purchasePrice: z.number().optional().default(0),
  prices: z.array(z.object({
    customerType: z.enum(["INDIVIDUAL", "MARKET", "WHOLESALE", "AGENT", "ONLINE"]),
    price: z.number().min(0),
  })).optional().default([]),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  const products = await prisma.product.findMany({
    include: {
      category: true,
      packaging: true,
      prices: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    barcode: p.barcode,
    categoryId: p.categoryId,
    categoryName: p.category?.name || null,
    packagingId: p.packagingId,
    packagingName: p.packaging?.name || null,
    piecesPerCarton: p.piecesPerCarton,
    unit: p.unit,
    purchasePrice: Number(p.purchasePrice),
    isActive: p.isActive,
    prices: p.prices.map((pr) => ({
      id: pr.id,
      productId: pr.productId,
      customerType: pr.customerType,
      price: Number(pr.price),
    })),
  }))

  return successResponse(data)
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return unauthorizedError()

  try {
    const body = await request.json()
    const parsed = productSchema.parse(body)

    const count = await prisma.product.count()
    const code = `PRD-${String(count + 1).padStart(5, "0")}`

    const product = await prisma.product.create({
      data: {
        name: parsed.name,
        code,
        barcode: parsed.barcode,
        categoryId: parsed.categoryId,
        packagingId: parsed.packagingId,
        piecesPerCarton: parsed.piecesPerCarton,
        unit: parsed.unit,
        purchasePrice: parsed.purchasePrice,
        prices: {
          create: parsed.prices,
        },
      },
      include: { prices: true, category: true, packaging: true },
    })

    await logAudit(currentUser.userId, "CREATE", "Product", product.id, { name: product.name })

    return successResponse({
      id: product.id,
      name: product.name,
      code: product.code,
      barcode: product.barcode,
      categoryName: product.category?.name || null,
      packagingName: product.packaging?.name || null,
      piecesPerCarton: product.piecesPerCarton,
      unit: product.unit,
      purchasePrice: Number(product.purchasePrice),
      prices: product.prices.map((pr) => ({
        id: pr.id,
        productId: pr.productId,
        customerType: pr.customerType,
        price: Number(pr.price),
      })),
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "))
    }
    console.error("Create product error:", error)
    return errorResponse("فشل إنشاء المادة", 500)
  }
}
