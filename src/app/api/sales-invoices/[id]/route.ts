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
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const salesInvoiceUpdateSchema = z.object({
  customerId: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
  currency: z.enum(["USD", "IQD"] as const).optional(),
  exchangeRateValue: z.coerce.number().min(0).optional(),
  paymentType: z.enum(["CASH", "CREDIT", "MIXED"] as const).optional(),
  paymentAccountId: z.string().optional().nullable(),
  paid: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1, "المادة مطلوبة"),
        quantity: z.coerce
          .number()
          .int()
          .min(1, "الكمية يجب أن تكون أكبر من 0"),
        unitPrice: z.coerce.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
        discountPercent: z.coerce.number().min(0).max(100).default(0),
        discountAmount: z.coerce.number().min(0).default(0),
        notes: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.SALES_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, code: true } },
      warehouse: { select: { id: true, name: true, code: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
  if (!invoice) return notFoundError();

  if (invoice.companyId && !(await canAccessCompany(user, invoice.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse({
    id: invoice.id,
    companyId: invoice.companyId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    customerId: invoice.customerId,
    customerName: invoice.customer?.name || null,
    customerCode: invoice.customer?.code || null,
    warehouseId: invoice.warehouseId,
    warehouseName: invoice.warehouse?.name || null,
    warehouseCode: invoice.warehouse?.code || null,
    currency: invoice.currency,
    exchangeRateValue: Number(invoice.exchangeRateValue ?? 0),
    paymentType: invoice.paymentType,
    totalBeforeTax: Number(invoice.totalBeforeTax ?? 0),
    taxAmount: Number(invoice.taxAmount ?? 0),
    discountAmount: Number(invoice.discountAmount ?? 0),
    discountPercent: Number(invoice.discountPercent ?? 0),
    totalAfterTax: Number(invoice.totalAfterTax ?? 0),
    totalInUsd: Number(invoice.totalInUsd ?? 0),
    paid: Number(invoice.paid ?? 0),
    remaining: Number(invoice.remaining ?? 0),
    status: invoice.status,
    notes: invoice.notes,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    items: invoice.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name || item.productNameSnapshot || null,
      productCode: item.product?.code || item.productCodeSnapshot || null,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice ?? 0),
      discountPercent: Number(item.discountPercent ?? 0),
      discountAmount: Number(item.discountAmount ?? 0),
      totalPrice: Number(item.totalPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      notes: item.notes,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.SALES_EDIT))
  ) {
    return forbiddenError("لا تملك صلاحية تعديل فاتورة بيع");
  }

  const { id } = await params;
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (
    existing.companyId &&
    !(await canAccessCompany(currentUser, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (existing.status !== "DRAFT") {
    return forbiddenError("لا يمكن تعديل فاتورة ليست في حالة مسودة");
  }

  try {
    const body = await request.json();
    const parsed = salesInvoiceUpdateSchema.parse(body);

    // Validate customer if changed
    if (parsed.customerId !== undefined) {
      if (parsed.customerId) {
        const customer = await prisma.customer.findFirst({
          where: { id: parsed.customerId, companyId: existing.companyId! },
        });
        if (!customer) {
          return errorResponse("العميل غير موجود أو لا ينتمي لهذه الشركة", 400);
        }
      }
    }

    // Validate warehouse if changed
    if (parsed.warehouseId !== undefined) {
      if (parsed.warehouseId) {
        const warehouse = await prisma.warehouse.findFirst({
          where: { id: parsed.warehouseId, companyId: existing.companyId! },
        });
        if (!warehouse) {
          return errorResponse("المخزن غير موجود أو لا ينتمي لهذه الشركة", 400);
        }
      }
    }

    // Validate payment account if changed
    if (parsed.paymentAccountId !== undefined && parsed.paymentAccountId) {
      const account = await prisma.paymentAccount.findUnique({
        where: { id: parsed.paymentAccountId },
      });
      if (!account) {
        return errorResponse("حساب الدفع غير موجود", 400);
      }
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.customerId !== undefined)
      updateData.customerId = parsed.customerId;
    if (parsed.warehouseId !== undefined)
      updateData.warehouseId = parsed.warehouseId;
    if (parsed.invoiceDate !== undefined && parsed.invoiceDate)
      updateData.invoiceDate = new Date(parsed.invoiceDate);
    if (parsed.currency !== undefined) updateData.currency = parsed.currency;
    if (parsed.paymentType !== undefined)
      updateData.paymentType = parsed.paymentType;
    if (parsed.paymentAccountId !== undefined)
      updateData.paymentAccountId = parsed.paymentAccountId;
    if (parsed.discountPercent !== undefined)
      updateData.discountPercent = parsed.discountPercent;
    if (parsed.discountAmount !== undefined)
      updateData.discountAmount = parsed.discountAmount;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes;

    // If lines provided, recompute everything server-side
    if (parsed.lines && parsed.lines.length > 0) {
      const productIds = parsed.lines.map((l) => l.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          companyId: existing.companyId!,
        },
      });
      if (products.length !== productIds.length) {
        return errorResponse(
          "بعض المواد غير موجودة أو لا تنتمي لهذه الشركة",
          400,
        );
      }

      const lineItems = parsed.lines.map((line) => {
        const product = products.find((p) => p.id === line.productId);
        const quantity = line.quantity;
        const unitPrice = line.unitPrice;
        const lineSubtotal = quantity * unitPrice;
        const lineDiscountPercent = line.discountPercent || 0;
        const lineDiscountAmount = line.discountAmount || 0;
        const lineTotal =
          lineSubtotal -
          lineSubtotal * (lineDiscountPercent / 100) -
          lineDiscountAmount;

        return {
          productId: line.productId,
          quantity,
          unitPrice,
          discountPercent: lineDiscountPercent,
          discountAmount: lineDiscountAmount,
          totalPrice: lineTotal,
          lineTotal: lineTotal,
          productNameSnapshot: product?.name || null,
          productCodeSnapshot: product?.code || null,
          notes: line.notes || null,
        };
      });

      const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
      const discountPercent =
        parsed.discountPercent !== undefined
          ? parsed.discountPercent
          : Number(existing.discountPercent ?? 0);
      const discountAmount =
        parsed.discountAmount !== undefined
          ? parsed.discountAmount
          : Number(existing.discountAmount ?? 0);
      const totalDiscount = subtotal * (discountPercent / 100) + discountAmount;
      const totalAfterTax = Math.max(0, subtotal - totalDiscount);

      const paymentType = parsed.paymentType || existing.paymentType || "CASH";
      let paid = 0;
      let remaining = 0;
      if (paymentType === "CASH") {
        paid = totalAfterTax;
        remaining = 0;
      } else if (paymentType === "CREDIT") {
        paid = 0;
        remaining = totalAfterTax;
      } else if (paymentType === "MIXED") {
        const paidInput =
          parsed.paid !== undefined ? parsed.paid : Number(existing.paid ?? 0);
        paid = Math.min(paidInput, totalAfterTax);
        remaining = totalAfterTax - paid;
      }

      const currency = parsed.currency || existing.currency || "IQD";
      const exchangeRateValue =
        parsed.exchangeRateValue !== undefined
          ? parsed.exchangeRateValue
          : Number(existing.exchangeRateValue ?? 1);
      const totalInUsd =
        currency === "USD" ? totalAfterTax : totalAfterTax / exchangeRateValue;

      updateData.totalBeforeTax = subtotal;
      updateData.taxAmount = 0;
      updateData.discountAmount = totalDiscount;
      updateData.discountPercent = discountPercent;
      updateData.totalAfterTax = totalAfterTax;
      updateData.totalInUsd = totalInUsd;
      updateData.paid = paid;
      updateData.remaining = remaining;
      updateData.exchangeRateValue = exchangeRateValue;
      updateData.exchangeRateSnapshot = exchangeRateValue;

      // Delete old items and recreate
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await prisma.invoice.update({
        where: { id },
        data: {
          ...updateData,
          items: { create: lineItems },
        },
      });
    } else {
      // No lines change — still recalc if payment/discount changed
      const paymentType = parsed.paymentType || existing.paymentType || "CASH";
      const totalAfterTax = Number(existing.totalAfterTax ?? 0);
      let paid = Number(existing.paid ?? 0);
      let remaining = Number(existing.remaining ?? 0);

      if (parsed.paymentType !== undefined || parsed.paid !== undefined) {
        if (paymentType === "CASH") {
          paid = totalAfterTax;
          remaining = 0;
        } else if (paymentType === "CREDIT") {
          paid = 0;
          remaining = totalAfterTax;
        } else if (paymentType === "MIXED") {
          const paidInput =
            parsed.paid !== undefined
              ? parsed.paid
              : Number(existing.paid ?? 0);
          paid = Math.min(paidInput, totalAfterTax);
          remaining = totalAfterTax - paid;
        }
        updateData.paid = paid;
        updateData.remaining = remaining;
      }

      if (parsed.exchangeRateValue !== undefined) {
        updateData.exchangeRateValue = parsed.exchangeRateValue;
        updateData.exchangeRateSnapshot = parsed.exchangeRateValue;
      }

      await prisma.invoice.update({ where: { id }, data: updateData });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    await logAudit(currentUser.userId, "UPDATE", "Invoice", id, {
      invoiceNumber: invoice?.invoiceNumber,
      companyId: invoice?.companyId,
    });

    return successResponse({
      id: invoice!.id,
      companyId: invoice!.companyId,
      invoiceNumber: invoice!.invoiceNumber,
      invoiceDate: invoice!.invoiceDate,
      customerId: invoice!.customerId,
      customerName: invoice!.customer?.name || null,
      warehouseId: invoice!.warehouseId,
      warehouseName: invoice!.warehouse?.name || null,
      currency: invoice!.currency,
      exchangeRateValue: Number(invoice!.exchangeRateValue ?? 0),
      paymentType: invoice!.paymentType,
      totalBeforeTax: Number(invoice!.totalBeforeTax ?? 0),
      taxAmount: Number(invoice!.taxAmount ?? 0),
      discountAmount: Number(invoice!.discountAmount ?? 0),
      discountPercent: Number(invoice!.discountPercent ?? 0),
      totalAfterTax: Number(invoice!.totalAfterTax ?? 0),
      totalInUsd: Number(invoice!.totalInUsd ?? 0),
      paid: Number(invoice!.paid ?? 0),
      remaining: Number(invoice!.remaining ?? 0),
      status: invoice!.status,
      notes: invoice!.notes,
      createdAt: invoice!.createdAt,
      items: invoice!.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || item.productNameSnapshot || null,
        productCode: item.product?.code || item.productCodeSnapshot || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice ?? 0),
        discountPercent: Number(item.discountPercent ?? 0),
        discountAmount: Number(item.discountAmount ?? 0),
        totalPrice: Number(item.totalPrice ?? 0),
        lineTotal: Number(item.lineTotal ?? 0),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Update sales invoice error:", error);
    return errorResponse("فشل تحديث فاتورة البيع", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.SALES_DELETE))
  ) {
    return forbiddenError("لا تملك صلاحية حذف فاتورة بيع");
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return notFoundError();

  if (
    invoice.companyId &&
    !(await canAccessCompany(currentUser, invoice.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (invoice.status !== "DRAFT") {
    return forbiddenError("لا يمكن حذف فاتورة ليست في حالة مسودة");
  }

  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
  await prisma.invoice.delete({ where: { id } });

  await logAudit(currentUser.userId, "DELETE", "Invoice", id, {
    invoiceNumber: invoice.invoiceNumber,
    companyId: invoice.companyId,
  });

  return successResponse({ id, action: "deleted" });
}
