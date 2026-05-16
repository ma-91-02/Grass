import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, logAudit, checkPermission } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError, notFoundError, forbiddenError } from "@/lib/api-response"
import { z } from "zod"
import { PERMISSIONS } from "@/lib/permissions"

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

  const canViewPurchasePrice = checkPermission(user, PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE)

  const result: Record<string, unknown> = {
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
    isActive: product.isActive,
    prices: product.prices.map((pr) => ({
      id: pr.id,
      productId: pr.productId,
      customerType: pr.customerType,
      price: Number(pr.price),
    })),
  }

  if (canViewPurchasePrice) {
    result.purchasePrice = Number(product.purchasePrice)
  }

  return successResponse(result)
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

    const canEditPrices = checkPermission(currentUser, PERMISSIONS.PRODUCTS_EDIT_PRICE)
    const canViewPurchasePrice = checkPermission(currentUser, PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE)

    if (!canEditPrices && (parsed.prices || parsed.purchasePrice !== undefined)) {
      return forbiddenError("لا تملك صلاحية تعديل الأسعار أو سعر الشراء")
    }

    const { prices, purchasePrice, ...productData } = parsed

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(canViewPurchasePrice && purchasePrice !== undefined ? { purchasePrice } : {}),
        ...(canEditPrices && prices
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

    const patchResult: Record<string, unknown> = {
      id: product.id,
      name: product.name,
      code: product.code,
      barcode: product.barcode,
      categoryName: product.category?.name || null,
      packagingName: product.packaging?.name || null,
      piecesPerCarton: product.piecesPerCarton,
      unit: product.unit,
      isActive: product.isActive,
      prices: product.prices.map((pr) => ({
        id: pr.id,
        productId: pr.productId,
        customerType: pr.customerType,
        price: Number(pr.price),
      })),
    }

    if (canViewPurchasePrice) {
      patchResult.purchasePrice = Number(product.purchasePrice)
    }

    return successResponse(patchResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "))
    }
    return errorResponse("فشل تحديث المادة", 500)
  }
}
