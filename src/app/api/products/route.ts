import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, checkPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

const productSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  code: z.string().min(1, "كود المادة مطلوب"),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().min(1, "المجموعة مطلوبة"),
  packaging: z.enum(["قطعة", "كارتون"] as const),
  piecesPerCarton: z.number().optional().default(0),
  purchasePrice: z.number().optional().default(0),
  purchaseCurrency: z
    .enum(["USD", "IQD"] as const)
    .optional()
    .default("IQD"),
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
    .optional()
    .default([]),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const products = await prisma.product.findMany({
    include: {
      category: true,
      prices: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const canViewPurchasePrice = checkPermission(
    user,
    PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE,
  );

  const data = products.map((p) => {
    const base: Record<string, unknown> = {
      id: p.id,
      name: p.name,
      code: p.code,
      barcode: p.barcode,
      categoryId: p.categoryId,
      categoryName: p.category?.name || null,
      packaging: p.packaging,
      piecesPerCarton: p.piecesPerCarton,
      unit: p.unit,
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

  if (!checkPermission(currentUser, PERMISSIONS.PRODUCTS_CREATE)) {
    return forbiddenError("لا تملك صلاحية إنشاء مادة");
  }

  try {
    const body = await request.json();
    const parsed = productSchema.parse(body);

    const canEditPrices = checkPermission(
      currentUser,
      PERMISSIONS.PRODUCTS_EDIT_PRICE,
    );
    const canViewPurchasePrice = checkPermission(
      currentUser,
      PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE,
    );

    if (!canEditPrices && (parsed.prices?.length || parsed.purchasePrice)) {
      return forbiddenError("لا تملك صلاحية تعديل الأسعار أو سعر الشراء");
    }

    const existingCode = await prisma.product.findUnique({
      where: { code: parsed.code },
    });
    if (existingCode) {
      return conflictError("كود المادة مستخدم مسبقاً.");
    }

    if (parsed.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: parsed.barcode },
      });
      if (existingBarcode) {
        return conflictError("الباركود مستخدم مسبقاً.");
      }
    }

    const product = await prisma.product.create({
      data: {
        name: parsed.name,
        code: parsed.code,
        barcode: parsed.barcode || null,
        categoryId: parsed.categoryId,
        packaging: parsed.packaging,
        piecesPerCarton:
          parsed.packaging === "كارتون" ? parsed.piecesPerCarton : 0,
        unit: parsed.packaging,
        purchasePrice: canViewPurchasePrice ? parsed.purchasePrice : 0,
        purchaseCurrency: canViewPurchasePrice
          ? parsed.purchaseCurrency
          : "IQD",
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
      include: { prices: true, category: true },
    });

    try {
      await logAudit(currentUser.userId, "CREATE", "Product", product.id, {
        name: product.name,
      });
    } catch {
      console.error("Audit log failed for product create");
    }

    const postResult: Record<string, unknown> = {
      id: product.id,
      name: product.name,
      code: product.code,
      barcode: product.barcode,
      categoryName: product.category?.name || null,
      packaging: product.packaging,
      piecesPerCarton: product.piecesPerCarton,
      unit: product.unit,
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
