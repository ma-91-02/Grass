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
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { productFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const productQuerySchema = z.object({
  companyId: z.string().min(1, "companyId مطلوب"),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.PRODUCTS_VIEW)))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) return errorResponse("companyId مطلوب");

  if (!(await canAccessCompany(user, companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const products = await prisma.product.findMany({
    where: { companyId },
    include: {
      category: true,
      unit: true,
      prices: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const canViewPurchasePrice = await requireDbPermission(
    user.userId,
    PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE,
  );

  const data = products.map((p) => {
    const base: Record<string, unknown> = {
      id: p.id,
      name: p.name,
      code: p.code,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: p.categoryId,
      categoryName: p.category?.name || null,
      unitId: p.unitId,
      unitName: p.unit?.name || null,
      packaging: p.packaging,
      piecesPerCarton: p.piecesPerCarton,
      productType: p.productType,
      description: p.description,
      isActive: p.isActive,
      prices: p.prices.map((pr) => ({
        id: pr.id,
        productId: pr.productId,
        customerType: pr.customerType,
        price: Number(pr.price),
        currency: pr.currency,
      })),
    };

    if (canViewPurchasePrice) {
      base.purchasePrice = Number(p.purchasePrice);
      base.purchaseCurrency = p.purchaseCurrency;
    }

    return base;
  });

  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!(await requireDbPermission(currentUser.userId, PERMISSIONS.PRODUCTS_CREATE))) {
    return forbiddenError("لا تملك صلاحية إنشاء مادة");
  }

  try {
    const body = await request.json();
    const parsed = productFormSchema.parse(body);

    if (!(await canAccessCompany(currentUser, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Validate category belongs to same company
    if (parsed.categoryId) {
      const category = await prisma.productCategory.findUnique({
        where: { id: parsed.categoryId },
        select: { companyId: true },
      });
      if (!category || category.companyId !== parsed.companyId) {
        return conflictError("التصنيف لا ينتمي لنفس الشركة");
      }
    }

    // Validate unit belongs to same company
    if (parsed.unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: parsed.unitId },
        select: { companyId: true },
      });
      if (!unit || unit.companyId !== parsed.companyId) {
        return conflictError("الوحدة لا تنتمي لنفس الشركة");
      }
    }

    const canEditPrices = await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.PRODUCTS_EDIT_PRICE,
    );
    const canViewPurchasePrice = await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE,
    );

    if (!canEditPrices && (parsed.prices?.length || parsed.purchasePrice)) {
      return forbiddenError("لا تملك صلاحية تعديل الأسعار أو سعر الشراء");
    }

    // Duplicate check per company
    const existingCode = await prisma.product.findFirst({
      where: { companyId: parsed.companyId, code: parsed.code },
    });
    if (existingCode) {
      return conflictError("كود المادة مستخدم مسبقاً في هذه الشركة.");
    }

    if (parsed.sku) {
      const existingSku = await prisma.product.findFirst({
        where: { companyId: parsed.companyId, sku: parsed.sku },
      });
      if (existingSku) {
        return conflictError("SKU مستخدم مسبقاً في هذه الشركة.");
      }
    }

    if (parsed.barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: { companyId: parsed.companyId, barcode: parsed.barcode },
      });
      if (existingBarcode) {
        return conflictError("الباركود مستخدم مسبقاً في هذه الشركة.");
      }
    }

    const product = await prisma.product.create({
      data: {
        companyId: parsed.companyId,
        name: parsed.name,
        code: parsed.code,
        sku: parsed.sku || null,
        barcode: parsed.barcode || null,
        categoryId: parsed.categoryId,
        unitId: parsed.unitId,
        packaging: parsed.packaging,
        piecesPerCarton:
          parsed.packaging === "كارتون" ? parsed.piecesPerCarton : 0,
        purchasePrice: canViewPurchasePrice ? parsed.purchasePrice : 0,
        purchaseCurrency: canViewPurchasePrice
          ? parsed.purchaseCurrency
          : "IQD",
        productType: parsed.productType,
        description: parsed.description || null,
        prices: canEditPrices
          ? {
              create: parsed.prices.map((p) => ({
                customerType: p.customerType,
                price: p.price,
                currency: p.currency,
              })),
            }
          : undefined,
      },
      include: { prices: true, category: true, unit: true },
    });

    await logAudit(currentUser.userId, "CREATE", "Product", product.id, {
      name: product.name,
      companyId: product.companyId,
    });

    const postResult: Record<string, unknown> = {
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
      prices: product.prices.map((pr) => ({
        id: pr.id,
        productId: pr.productId,
        customerType: pr.customerType,
        price: Number(pr.price),
        currency: pr.currency,
      })),
    };

    if (canViewPurchasePrice) {
      postResult.purchasePrice = Number(product.purchasePrice);
      postResult.purchaseCurrency = product.purchaseCurrency;
    }

    return successResponse(postResult, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create product error:", error);
    return errorResponse("فشل إنشاء المادة", 500);
  }
}
