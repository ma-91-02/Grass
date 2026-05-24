import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const patchReturnLineSchema = z.object({
  id: z.string().min(1, "معرف البند مطلوب"),
  productId: z.string().min(1, "المنتج مطلوب"),
  quantity: z.coerce.number().positive("الكمية يجب أن تكون أكبر من 0"),
  notes: z.string().optional().nullable(),
});

const patchReturnSchema = z.object({
  notes: z.string().optional().nullable(),
  lines: z
    .array(patchReturnLineSchema)
    .min(1, "يجب إضافة بند مرتجع واحد على الأقل"),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.SALES_RETURNS_VIEW))
  ) {
    return forbiddenError("لا تملك صلاحية عرض مرتجعات المبيعات");
  }

  const { id } = await params;
  const salesReturn = await prisma.salesReturn.findUnique({
    where: { id },
    include: {
      originalInvoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAfterTax: true,
        },
      },
      customer: { select: { id: true, name: true, code: true } },
      warehouse: { select: { id: true, name: true } },
      lines: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  if (!salesReturn) return notFoundError();

  if (
    salesReturn.companyId &&
    !(await canAccessCompany(user, salesReturn.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse({
    id: salesReturn.id,
    returnNumber: salesReturn.returnNumber,
    companyId: salesReturn.companyId,
    originalInvoiceId: salesReturn.originalInvoiceId,
    originalInvoiceNumber: salesReturn.originalInvoice?.invoiceNumber,
    originalInvoiceStatus: salesReturn.originalInvoice?.status,
    customerId: salesReturn.customerId,
    customerName: salesReturn.customer?.name,
    warehouseId: salesReturn.warehouseId,
    warehouseName: salesReturn.warehouse?.name,
    returnDate: salesReturn.returnDate,
    currency: salesReturn.currency,
    totalAmount: Number(salesReturn.totalAmount),
    totalCogs: Number(salesReturn.totalCogs),
    status: salesReturn.status,
    postedAt: salesReturn.postedAt,
    postedById: salesReturn.postedById,
    journalEntryId: salesReturn.journalEntryId,
    cogsJournalEntryId: salesReturn.cogsJournalEntryId,
    notes: salesReturn.notes,
    createdAt: salesReturn.createdAt,
    lines: salesReturn.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product?.name,
      productCode: l.product?.code,
      quantity: l.quantity,
      unitPriceSnapshot: Number(l.unitPriceSnapshot),
      averageCostSnapshot: Number(l.averageCostSnapshot),
      lineTotal: Number(l.lineTotal),
      stockMovementId: l.stockMovementId,
      notes: l.notes,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.SALES_RETURNS_CREATE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية تعديل مرتجع البيع");
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = patchReturnSchema.parse(body);

    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id },
      include: {
        lines: {
          include: { product: { select: { id: true, name: true } } },
        },
        originalInvoice: {
          include: { items: true },
        },
      },
    });

    if (!salesReturn) return notFoundError("المرتجع غير موجود");
    if (salesReturn.status !== "DRAFT") {
      return errorResponse("لا يمكن تعديل مرتجع غير مسودة", 400);
    }

    if (
      salesReturn.companyId &&
      !(await canAccessCompany(user, salesReturn.companyId))
    ) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Build existing line lookup
    const existingLineMap = new Map(salesReturn.lines.map((l) => [l.id, l]));

    // Verify each incoming line
    const updateData: {
      id: string;
      originalInvoiceItemId: string;
      productId: string;
      quantity: number;
      unitPriceSnapshot: number;
      averageCostSnapshot: number;
      lineTotal: number;
      notes: string | null;
    }[] = [];

    let newTotalAmount = 0;
    let newTotalCogs = 0;

    for (const line of parsed.lines) {
      const existing = existingLineMap.get(line.id);
      if (!existing) {
        return errorResponse(
          `البند ${line.id} غير موجود في المرتجع`,
          400,
        );
      }
      if (existing.productId !== line.productId) {
        return conflictError(
          "لا يمكن تغيير المنتج لبند موجود",
        );
      }

      // Check max allowed quantity against posted returns
      const alreadyReturned = await prisma.salesReturnLine.aggregate({
        where: {
          originalInvoiceItemId: existing.originalInvoiceItemId,
          salesReturn: {
            originalInvoiceId: salesReturn.originalInvoiceId,
            status: "POSTED",
          },
        },
        _sum: { quantity: true },
      });

      const postedQty = alreadyReturned._sum.quantity ?? 0;
      const origItem = salesReturn.originalInvoice.items.find(
        (i) => i.id === existing.originalInvoiceItemId,
      );
      if (!origItem) {
        return errorResponse(
          `بند الفاتورة الأصلي غير موجود للمنتج`,
          400,
        );
      }
      const maxReturn = origItem.quantity - postedQty;

      if (line.quantity > maxReturn) {
        return errorResponse(
          `الكمية (${line.quantity}) تتجاوز الكمية المتبقية (${maxReturn}) للمنتج`,
          400,
        );
      }

      const unitPrice = Number(existing.unitPriceSnapshot);
      const avgCost = Number(existing.averageCostSnapshot);
      const lineTotal = line.quantity * unitPrice;
      const lineCogs = line.quantity * avgCost;

      newTotalAmount += lineTotal;
      newTotalCogs += lineCogs;

      updateData.push({
        id: existing.id,
        originalInvoiceItemId: existing.originalInvoiceItemId,
        productId: existing.productId,
        quantity: line.quantity,
        unitPriceSnapshot: unitPrice,
        averageCostSnapshot: avgCost,
        lineTotal,
        notes: line.notes ?? null,
      });
    }

    // Update within transaction
    const updated = await prisma.$transaction(async (tx) => {
      await tx.salesReturn.update({
        where: { id },
        data: {
          notes: parsed.notes ?? null,
          totalAmount: newTotalAmount,
          totalCogs: newTotalCogs,
        },
      });

      for (const item of updateData) {
        await tx.salesReturnLine.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            notes: item.notes,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "UPDATE",
          entity: "SalesReturn",
          entityId: id,
          details: {
            returnNumber: salesReturn.returnNumber,
            totalAmount: newTotalAmount,
            totalCogs: newTotalCogs,
            lineCount: updateData.length,
          } as never,
        },
      });

      return tx.salesReturn.findUnique({
        where: { id },
        include: {
          lines: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      });
    });

    return successResponse({
      id: updated!.id,
      returnNumber: updated!.returnNumber,
      status: updated!.status,
      totalAmount: Number(updated!.totalAmount),
      totalCogs: Number(updated!.totalCogs),
      notes: updated!.notes,
      lines: updated!.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name,
        quantity: l.quantity,
        lineTotal: Number(l.lineTotal),
        notes: l.notes,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "), 400);
    }
    const message =
      error instanceof Error ? error.message : "فشل تحديث المرتجع";
    return errorResponse(message, 500);
  }
}
