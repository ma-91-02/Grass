import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, logAudit } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError, notFoundError } from "@/lib/api-response"
import { z } from "zod"

const productSchema = z.object({
  name: z.string().min(1).optional(),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  packagingId: z.string().optional().nullable(),
  piecesPerCarton: z.number().optional(),
  unit: z.string().optional(),
  purchasePrice: z.number().optional(),
  isActive: z.boolean().optional(),
  prices: z.array(z.object({
    customerType: z.enum(["INDIVIDUAL", "MARKET", "WHOLESALE", "AGENT", "ONLINE"]),
    price: z.number().min(0),
  })).optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedError()

  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { prices: true, category: true, packaging: true },
  })

  if (!product) return notFoundError()

  return successResponse({
    id: product.id,
    name: product.name,
    code: product.code,
    barcode: product.barcode,
    categoryId: product.categoryId,
    categoryName: product.category?.name || null,
    packagingId: product.packagingId,
    packagingName: product.packaging?.name || null,
    piecesPerCarton: product.piecesPerCarton,
    unit: product.unit,
    purchasePrice: Number(product.purchasePrice),
    isActive: product.isActive,
    prices: product.prices.map((pr) => ({
      id: pr.id,
      productId: pr.productId,
      customerType: pr.customerType,
      price: Number(pr.price),
    })),
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return unauthorizedError()

  const { id } = await params
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return notFoundError()

  try {
    const body = await request.json()
    const parsed = productSchema.parse(body)

    const { prices, ...productData } = parsed

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(prices
          ? {
              prices: {
                deleteMany: {},
                create: prices,
              },
            }
          : {}),
      },
      include: { prices: true, category: true, packaging: true },
    })

    await logAudit(currentUser.userId, "UPDATE", "Product", id, { name: product.name })

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
      isActive: product.isActive,
      prices: product.prices.map((pr) => ({
        id: pr.id,
        productId: pr.productId,
        customerType: pr.customerType,
        price: Number(pr.price),
      })),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "))
    }
    return errorResponse("فشل تحديث المادة", 500)
  }
}
