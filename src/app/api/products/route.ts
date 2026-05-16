import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, logAudit, checkPermission } from "@/lib/auth"
import { successResponse, errorResponse, unauthorizedError, forbiddenError } from "@/lib/api-response"
import { z } from "zod"
import { PERMISSIONS } from "@/lib/permissions"

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

  const canViewPurchasePrice = checkPermission(user, PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE)

  const data = products.map((p) => {
    const base: Record<string, unknown> = {
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
      isActive: p.isActive,
      prices: p.prices.map((pr) => ({
        id: pr.id,
        productId: pr.productId,
        customerType: pr.customerType,
        price: Number(pr.price),
      })),
    }

    if (canViewPurchasePrice) {
      base.purchasePrice = Number(p.purchasePrice)
    }

    return base
  })

  return successResponse(data)
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return unauthorizedError()

  try {
    const body = await request.json()
    const parsed = productSchema.parse(body)

    const canEditPrices = checkPermission(currentUser, PERMISSIONS.PRODUCTS_EDIT_PRICE)
    const canViewPurchasePrice = checkPermission(currentUser, PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE)

    if (!canEditPrices && (parsed.prices?.length || parsed.purchasePrice)) {
      return forbiddenError("لا تملك صلاحية تعديل الأسعار أو سعر الشراء")
    }

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
        purchasePrice: canViewPurchasePrice ? parsed.purchasePrice : 0,
        prices: canEditPrices ? { create: parsed.prices } : undefined,
      },
      include: { prices: true, category: true, packaging: true },
    })

    await logAudit(currentUser.userId, "CREATE", "Product", product.id, { name: product.name })

    const postResult: Record<string, unknown> = {
      id: product.id,
      name: product.name,
      code: product.code,
      barcode: product.barcode,
      categoryName: product.category?.name || null,
      packagingName: product.packaging?.name || null,
      piecesPerCarton: product.piecesPerCarton,
      unit: product.unit,
      prices: product.prices.map((pr) => ({
        id: pr.id,
        productId: pr.productId,
        customerType: pr.customerType,
        price: Number(pr.price),
      })),
    }

    if (canViewPurchasePrice) {
      postResult.purchasePrice = Number(product.purchasePrice)
    }

    return successResponse(postResult, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "))
    }
    console.error("Create product error:", error)
    return errorResponse("فشل إنشاء المادة", 500)
  }
}
