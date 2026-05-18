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
} from "@/lib/api-response";
import { salesInvoiceFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.SALES_VIEW)))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const customerId = searchParams.get("customerId");
  const warehouseId = searchParams.get("warehouseId");
  const status = searchParams.get("status");
  const paymentType = searchParams.get("paymentType");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const search = searchParams.get("search");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  // Pagination normalization
  let page = parseInt(pageParam || "1", 10);
  let limit = parseInt(limitParam || "20", 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  const whereClause: Record<string, unknown> = {};

  if (companyId) {
    if (!(await canAccessCompany(user, companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }
    whereClause.companyId = companyId;
  } else if (!isGlobalAdmin && dbUser?.companyId) {
    whereClause.companyId = dbUser.companyId;
  }

  if (customerId) {
    whereClause.customerId = customerId;
  }
  if (warehouseId) {
    whereClause.warehouseId = warehouseId;
  }
  if (status) {
    whereClause.status = status;
  }
  if (paymentType) {
    whereClause.paymentType = paymentType;
  }

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;
  if (fromDate && toDate) {
    whereClause.invoiceDate = { gte: fromDate, lte: toDate };
  } else if (fromDate) {
    whereClause.invoiceDate = { gte: fromDate };
  } else if (toDate) {
    whereClause.invoiceDate = { lte: toDate };
  }

  // Search on invoiceNumber or customerName
  if (search) {
    whereClause.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      {
        customer: {
          name: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, code: true },
        },
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where: whereClause }),
  ]);

  const data = invoices.map((inv) => ({
    id: inv.id,
    companyId: inv.companyId,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    customerId: inv.customerId,
    customerName: inv.customer?.name || null,
    customerCode: inv.customer?.code || null,
    warehouseId: inv.warehouseId,
    warehouseName: inv.warehouse?.name || null,
    warehouseCode: inv.warehouse?.code || null,
    currency: inv.currency,
    exchangeRateValue: Number(inv.exchangeRateValue ?? 0),
    paymentType: inv.paymentType,
    totalBeforeTax: Number(inv.totalBeforeTax ?? 0),
    taxAmount: Number(inv.taxAmount ?? 0),
    discountAmount: Number(inv.discountAmount ?? 0),
    discountPercent: Number(inv.discountPercent ?? 0),
    totalAfterTax: Number(inv.totalAfterTax ?? 0),
    totalInUsd: Number(inv.totalInUsd ?? 0),
    paid: Number(inv.paid ?? 0),
    remaining: Number(inv.remaining ?? 0),
    status: inv.status,
    notes: inv.notes,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    items: inv.items.map((item) => ({
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
  }));

  // Summary from the current page only (consistent with other endpoints)
  const summary = {
    totalInvoices: total,
    totalAmount: data.reduce((sum, inv) => sum + inv.totalAfterTax, 0),
    totalPaid: data.reduce((sum, inv) => sum + inv.paid, 0),
    totalRemaining: data.reduce((sum, inv) => sum + inv.remaining, 0),
  };

  return successResponse({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary,
  });
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.SALES_CREATE))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء فاتورة بيع");
  }

  try {
    const body = await request.json();
    const parsed = salesInvoiceFormSchema.parse(body);

    if (!(await canAccessCompany(currentUser, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Validate customer belongs to same company if provided
    let customerForCreditCheck: Awaited<
      ReturnType<
        typeof prisma.customer.findFirst<{
          select: { id: true; creditLimit: true; currentBalance: true };
        }>
      >
    > = null;
    if (parsed.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: parsed.customerId, companyId: parsed.companyId },
        select: { id: true, creditLimit: true, currentBalance: true },
      });
      if (!customer) {
        return errorResponse("العميل غير موجود أو لا ينتمي لهذه الشركة", 400);
      }
      customerForCreditCheck = customer;
    }

    // Validate warehouse belongs to same company if provided
    if (parsed.warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: parsed.warehouseId, companyId: parsed.companyId },
      });
      if (!warehouse) {
        return errorResponse("المخزن غير موجود أو لا ينتمي لهذه الشركة", 400);
      }
    }

    // Validate all products belong to same company
    const productIds = parsed.lines.map((l) => l.productId);
    const uniqueProductIds = [...new Set(productIds)];
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, companyId: parsed.companyId },
      include: { prices: true },
    });
    if (products.length !== uniqueProductIds.length) {
      return errorResponse(
        "بعض المواد غير موجودة أو لا تنتمي لهذه الشركة",
        400,
      );
    }

    // Validate line discounts and calculate line totals server-side
    for (const line of parsed.lines) {
      const lineSubtotal = line.quantity * line.unitPrice;
      const lineDiscountPercent = line.discountPercent || 0;
      const lineDiscountAmount = line.discountAmount || 0;
      const lineTotal =
        lineSubtotal -
        lineSubtotal * (lineDiscountPercent / 100) -
        lineDiscountAmount;
      if (lineTotal < 0) {
        return errorResponse(
          "خصم البند لا يمكن أن يتجاوز المجموع الفرعي للبند",
          400,
        );
      }
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
        totalPrice: lineTotal, // backward-compat
        lineTotal: lineTotal,
        productNameSnapshot: product?.name || null,
        productCodeSnapshot: product?.code || null,
        notes: line.notes || null,
      };
    });

    const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
    const discountPercent = parsed.discountPercent || 0;
    const discountAmount = parsed.discountAmount || 0;
    const totalDiscount = subtotal * (discountPercent / 100) + discountAmount;
    const totalAfterTax = Math.max(0, subtotal - totalDiscount);
    const taxAmount = 0; // placeholder until tax module

    // Discount hardening
    if (totalDiscount > subtotal) {
      return errorResponse(
        "إجمالي الخصم لا يمكن أن يتجاوز المجموع الفرعي",
        400,
      );
    }
    if (totalAfterTax < 0) {
      return errorResponse("المجموع الإجمالي لا يمكن أن يكون سالباً", 400);
    }

    // Payment calculations
    let paid = 0;
    let remaining = 0;
    if (parsed.paymentType === "CASH") {
      paid = totalAfterTax;
      remaining = 0;
    } else if (parsed.paymentType === "CREDIT") {
      paid = 0;
      remaining = totalAfterTax;
    } else if (parsed.paymentType === "MIXED") {
      paid = Math.min(parsed.paid ?? 0, totalAfterTax);
      remaining = totalAfterTax - paid;
    }

    // Total consistency guards
    if (paid < 0 || remaining < 0) {
      return errorResponse(
        "المبلغ المدفوع أو المتبقي لا يمكن أن يكون سالباً",
        400,
      );
    }
    if (paid > totalAfterTax) {
      return errorResponse(
        "المبلغ المدفوع لا يمكن أن يتجاوز المجموع الإجمالي",
        400,
      );
    }

    // Credit limit check for CREDIT / MIXED
    if (
      customerForCreditCheck &&
      (parsed.paymentType === "CREDIT" || parsed.paymentType === "MIXED") &&
      remaining > 0
    ) {
      const creditLimit = Number(customerForCreditCheck.creditLimit ?? 0);
      if (creditLimit > 0) {
        const currentBalance = Number(
          customerForCreditCheck.currentBalance ?? 0,
        );
        const projectedBalance = currentBalance + remaining;
        if (projectedBalance > creditLimit) {
          return errorResponse(
            `تجاوز حد الائتمان: الرصيد الحالي ${currentBalance} + ${remaining} = ${projectedBalance}، الحد الأقصى ${creditLimit}`,
            400,
          );
        }
      }
    }

    // Exchange rate
    const exchangeRateValue =
      parsed.currency === "USD" ? 1 : parsed.exchangeRateValue || 1;
    const totalInUsd =
      parsed.currency === "USD"
        ? totalAfterTax
        : totalAfterTax / exchangeRateValue;

    // Generate invoice number per company
    const count = await prisma.invoice.count({
      where: { companyId: parsed.companyId },
    });
    const invoiceNumber = `INV-${parsed.companyId.slice(-4)}-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        companyId: parsed.companyId,
        invoiceNumber,
        customerId: parsed.customerId || null,
        warehouseId: parsed.warehouseId || null,
        currency: parsed.currency,
        exchangeRateValue,
        exchangeRateSnapshot: exchangeRateValue,
        paymentType: parsed.paymentType,
        paymentAccountId: parsed.paymentAccountId || null,
        totalBeforeTax: subtotal,
        taxAmount,
        discountAmount: parsed.discountAmount || 0,
        discountPercent,
        totalAfterTax,
        totalInUsd,
        paid,
        remaining,
        invoiceDate: parsed.invoiceDate
          ? new Date(parsed.invoiceDate)
          : new Date(),
        status: "DRAFT",
        notes: parsed.notes || null,
        createdById: currentUser.userId,
        items: { create: lineItems },
      },
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

    await logAudit(currentUser.userId, "CREATE", "Invoice", invoice.id, {
      invoiceNumber: invoice.invoiceNumber,
      companyId: invoice.companyId,
      totalAfterTax: Number(invoice.totalAfterTax),
    });

    return successResponse(
      {
        id: invoice.id,
        companyId: invoice.companyId,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerId: invoice.customerId,
        customerName: invoice.customer?.name || null,
        warehouseId: invoice.warehouseId,
        warehouseName: invoice.warehouse?.name || null,
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
        })),
      },
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create sales invoice error:", error);
    return errorResponse("فشل إنشاء فاتورة البيع", 500);
  }
}
