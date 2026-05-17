import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  logAudit,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
  packaging: z.enum(["قطعة", "كارتون"] as const).optional(),
  piecesPerCarton: z.number().optional(),
  purchasePrice: z.number().optional(),
  purchaseCurrency: z.enum(["USD", "IQD"] as const).optional(),
  productType: z.enum(["STOCK", "SERVICE"] as const).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  prices: z
    .array(
      z.object({
        customerType: z.enum([
          "INDIVIDUAL",
          "MARKET",
          "WHOLESALE",
          "AGENT",
          "ONLINE",
        ]),
        price: z.number().min(0),
        currency: z.enum(["USD", "IQD"] as const).default("IQD"),
      }),
    )
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.PRODUCTS_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { prices: true, category: true, unit: true },
  });

  if (!product) return notFoundError();

  if (product.companyId && !(await canAccessCompany(user, product.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const canViewPurchasePrice = await requireDbPermission(
    user.userId,
    PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE,
  );

  const result: Record<string, unknown> = {
    id: product.id,
    name: product.name,
    code: product.code,
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId,
    categoryName: product.category?.name || null,
    unitId: product.unitId,
    unitName: product.unit?.name || null,
    packaging: product.packaging,
    piecesPerCarton: product.piecesPerCarton,
    productType: product.productType,
    description: product.description,
    isActive: product.isActive,
    prices: product.prices.map((pr) => ({
      id: pr.id,
      productId: pr.productId,
      customerType: pr.customerType,
      price: Number(pr.price),
      currency: pr.currency,
    })),
  };

  if (canViewPurchasePrice) {
    result.purchasePrice = Number(product.purchasePrice);
    result.purchaseCurrency = product.purchaseCurrency;
  }

  return successResponse(result);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.PRODUCTS_EDIT))
  ) {
    return forbiddenError("لا تملك صلاحية تعديل مادة");
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (
    existing.companyId &&
    !(await canAccessCompany(currentUser, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = productUpdateSchema.parse(body);

    const canEditPrices = await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.PRODUCTS_EDIT_PRICE,
    );
    const canViewPurchasePrice = await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE,
    );

    if (
      !canEditPrices &&
      (parsed.prices || parsed.purchasePrice !== undefined)
    ) {
      return forbiddenError("لا تملك صلاحية تعديل الأسعار أو سعر الشراء");
    }

    // Cross-company relation validation
    if (parsed.categoryId && existing.companyId) {
      const category = await prisma.productCategory.findUnique({
        where: { id: parsed.categoryId },
        select: { companyId: true },
      });
      if (!category || category.companyId !== existing.companyId) {
        return conflictError("التصنيف لا ينتمي لنفس الشركة");
      }
    }

    if (parsed.unitId && existing.companyId) {
      const unit = await prisma.unit.findUnique({
        where: { id: parsed.unitId },
        select: { companyId: true },
      });
      if (!unit || unit.companyId !== existing.companyId) {
        return conflictError("الوحدة لا تنتمي لنفس الشركة");
      }
    }

    // Per-company duplicate checks
    if (parsed.code && parsed.code !== existing.code && existing.companyId) {
      const duplicateCode = await prisma.product.findFirst({
        where: {
          companyId: existing.companyId,
          code: parsed.code,
          id: { not: id },
        },
      });
      if (duplicateCode) {
        return conflictError("كود المادة مستخدم مسبقاً في هذه الشركة.");
      }
    }

    if (
      parsed.sku !== undefined &&
      parsed.sku !== existing.sku &&
      parsed.sku &&
      existing.companyId
    ) {
      const duplicateSku = await prisma.product.findFirst({
        where: {
          companyId: existing.companyId,
          sku: parsed.sku,
          id: { not: id },
        },
      });
      if (duplicateSku) {
        return conflictError("SKU مستخدم مسبقاً في هذه الشركة.");
      }
    }

    if (
      parsed.barcode !== undefined &&
      parsed.barcode !== existing.barcode &&
      parsed.barcode &&
      existing.companyId
    ) {
      const duplicateBarcode = await prisma.product.findFirst({
        where: {
          companyId: existing.companyId,
          barcode: parsed.barcode,
          id: { not: id },
        },
      });
      if (duplicateBarcode) {
        return conflictError("الباركود مستخدم مسبقاً في هذه الشركة.");
      }
    }

    const { prices, purchasePrice, purchaseCurrency, ...productData } = parsed;

    const updateData: Record<string, unknown> = { ...productData };

    if (canViewPurchasePrice && purchasePrice !== undefined) {
      updateData.purchasePrice = purchasePrice;
    }
    if (canViewPurchasePrice && purchaseCurrency !== undefined) {
      updateData.purchaseCurrency = purchaseCurrency;
    }
    if (
      productData.packaging === "كارتون" &&
      productData.piecesPerCarton !== undefined
    ) {
      updateData.piecesPerCarton = productData.piecesPerCarton;
    } else if (productData.packaging === "قطعة") {
      updateData.piecesPerCarton = 0;
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...updateData,
        ...(canEditPrices && prices
          ? {
              prices: {
                deleteMany: {},
                create: prices.map((p) => ({
                  customerType: p.customerType,
                  price: p.price,
                  currency: p.currency,
                })),
              },
            }
          : {}),
      },
      include: { prices: true, category: true, unit: true },
    });

    await logAudit(currentUser.userId, "UPDATE", "Product", id, {
      name: product.name,
    });

    const patchResult: Record<string, unknown> = {
      id: product.id,
      name: product.name,
      code: product.code,
      sku: product.sku,
      barcode: product.barcode,
      categoryName: product.category?.name || null,
      unitName: product.unit?.name || null,
      packaging: product.packaging,
      piecesPerCarton: product.piecesPerCarton,
      productType: product.productType,
      description: product.description,
      isActive: product.isActive,
      prices: product.prices.map((pr) => ({
        id: pr.id,
        productId: pr.productId,
        customerType: pr.customerType,
        price: Number(pr.price),
        currency: pr.currency,
      })),
    };

    if (canViewPurchasePrice) {
      patchResult.purchasePrice = Number(product.purchasePrice);
      patchResult.purchaseCurrency = product.purchaseCurrency;
    }

    return successResponse(patchResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث المادة", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.PRODUCTS_DELETE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية حذف المواد");
  }

  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return notFoundError();

    if (
      product.companyId &&
      !(await canAccessCompany(currentUser, product.companyId))
    ) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Check all business activities
    const [invoiceItemsCount, purchaseInvoiceItemsCount, stockMovementsCount] =
      await Promise.all([
        prisma.invoiceItem.count({ where: { productId: id } }),
        prisma.purchaseInvoiceItem.count({ where: { productId: id } }),
        prisma.stockMovement.count({ where: { productId: id } }),
      ]);

    const totalRelated =
      invoiceItemsCount + purchaseInvoiceItemsCount + stockMovementsCount;

    if (totalRelated > 0) {
      // Safe deactivate
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit(currentUser.userId, "DEACTIVATE", "Product", id, {
        name: product.name,
        reason: "has_activity",
        invoiceItems: invoiceItemsCount,
        purchaseItems: purchaseInvoiceItemsCount,
        stockMovements: stockMovementsCount,
      });

      return successResponse({
        id,
        action: "deactivated",
        isActive: false,
      });
    }

    // Hard delete allowed if no activity
    await prisma.productPrice.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    await logAudit(currentUser.userId, "DELETE", "Product", id, {
      name: product.name,
      wasPermanent: true,
    });

    return successResponse({ id, action: "deleted" });
  } catch (error) {
    console.error("Delete product error:", error);
    return errorResponse("فشل حذف المادة", 500);
  }
}
