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
import { salesReturnSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.SALES_RETURNS_VIEW))
  ) {
    return forbiddenError("لا تملك صلاحية عرض مرتجعات المبيعات");
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const customerId = searchParams.get("customerId");
  const originalInvoiceId = searchParams.get("originalInvoiceId");
  const status = searchParams.get("status");
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

  const where: Record<string, unknown> = {};

  if (companyId) {
    if (!(await canAccessCompany(user, companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }
    where.companyId = companyId;
  } else {
    const userRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { companyId: true },
    });
    if (userRecord?.companyId) {
      where.companyId = userRecord.companyId;
    }
  }

  if (customerId) {
    where.customerId = customerId;
  }
  if (originalInvoiceId) {
    where.originalInvoiceId = originalInvoiceId;
  }
  if (status) {
    where.status = status;
  }

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;
  if (fromDate && toDate) {
    where.returnDate = { gte: fromDate, lte: toDate };
  } else if (fromDate) {
    where.returnDate = { gte: fromDate };
  } else if (toDate) {
    where.returnDate = { lte: toDate };
  }

  // Search on returnNumber, original invoiceNumber, or customerName
  if (search) {
    where.OR = [
      { returnNumber: { contains: search, mode: "insensitive" } },
      {
        originalInvoice: {
          invoiceNumber: { contains: search, mode: "insensitive" },
        },
      },
      {
        customer: {
          name: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [returns, total] = await Promise.all([
    prisma.salesReturn.findMany({
      where,
      orderBy: { returnDate: "desc" },
      skip,
      take: limit,
      include: {
        originalInvoice: {
          select: { id: true, invoiceNumber: true, status: true },
        },
        customer: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, code: true } },
          },
        },
      },
    }),
    prisma.salesReturn.count({ where }),
  ]);

  const data = returns.map((r) => ({
    id: r.id,
    returnNumber: r.returnNumber,
    companyId: r.companyId,
    originalInvoiceId: r.originalInvoiceId,
    originalInvoiceNumber: r.originalInvoice?.invoiceNumber,
    originalInvoiceStatus: r.originalInvoice?.status,
    customerId: r.customerId,
    customerName: r.customer?.name,
    warehouseId: r.warehouseId,
    warehouseName: r.warehouse?.name,
    returnDate: r.returnDate,
    currency: r.currency,
    totalAmount: Number(r.totalAmount),
    totalCogs: Number(r.totalCogs),
    status: r.status,
    postedAt: r.postedAt,
    notes: r.notes,
    createdAt: r.createdAt,
    lines: r.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product?.name,
      quantity: l.quantity,
      unitPriceSnapshot: Number(l.unitPriceSnapshot),
      averageCostSnapshot: Number(l.averageCostSnapshot),
      lineTotal: Number(l.lineTotal),
      notes: l.notes,
    })),
  }));

  const summary = {
    totalReturns: total,
    totalAmount: data.reduce((sum, r) => sum + r.totalAmount, 0),
    totalCogs: data.reduce((sum, r) => sum + r.totalCogs, 0),
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
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.SALES_RETURNS_CREATE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء مرتجع بيع");
  }

  try {
    const body = await request.json();
    const parsed = salesReturnSchema.parse(body);

    const { companyId, originalInvoiceId, returnDate, currency, notes, lines } =
      parsed;

    if (!(await canAccessCompany(currentUser, companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Load original invoice with items
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: originalInvoiceId },
      include: { items: true },
    });

    if (!originalInvoice) return notFoundError("الفاتورة الأصلية غير موجودة");
    if (originalInvoice.status !== "POSTED") {
      return errorResponse("الفاتورة الأصلية يجب أن تكون مرحلة", 400);
    }
    if (originalInvoice.companyId !== companyId) {
      return conflictError("الفاتورة لا تنتمي لهذه الشركة");
    }

    // Verify currency match
    if (originalInvoice.currency !== currency) {
      return conflictError("عملة المرتجع يجب أن تطابق عملة الفاتورة الأصلية");
    }

    const customerId = originalInvoice.customerId!;
    const warehouseId = originalInvoice.warehouseId!;

    // Build item lookup
    const invoiceItemMap = new Map(originalInvoice.items.map((i) => [i.id, i]));

    // Check previously returned quantities for each invoice item
    const previouslyReturned = await prisma.salesReturnLine.groupBy({
      by: ["originalInvoiceItemId"],
      where: {
        originalInvoiceItemId: {
          in: lines.map((l) => l.originalInvoiceItemId),
        },
        salesReturn: {
          originalInvoiceId,
          status: "POSTED",
        },
      },
      _sum: { quantity: true },
    });

    const returnedQtyMap = new Map(
      previouslyReturned.map((r) => [
        r.originalInvoiceItemId,
        r._sum.quantity ?? 0,
      ]),
    );

    // Validate each line
    let totalAmount = 0;
    let totalCogs = 0;
    const returnLines: {
      originalInvoiceItemId: string;
      productId: string;
      quantity: number;
      unitPriceSnapshot: number;
      averageCostSnapshot: number;
      lineTotal: number;
      notes: string | null;
    }[] = [];

    for (const line of lines) {
      const invoiceItem = invoiceItemMap.get(line.originalInvoiceItemId);
      if (!invoiceItem) {
        return errorResponse(
          `بند الفاتورة ${line.originalInvoiceItemId} غير موجود في الفاتورة الأصلية`,
          400,
        );
      }
      if (invoiceItem.productId !== line.productId) {
        return conflictError(
          `المنتج لا يطابق بند الفاتورة ${line.originalInvoiceItemId}`,
        );
      }

      const alreadyReturned =
        returnedQtyMap.get(line.originalInvoiceItemId) ?? 0;
      const maxReturn = invoiceItem.quantity - alreadyReturned;

      if (line.quantity > maxReturn) {
        return errorResponse(
          `الكمية المرتجعة (${line.quantity}) تتجاوز الكمية المتبقية (${maxReturn}) للمنتج`,
          400,
        );
      }

      const unitPrice = Number(invoiceItem.unitPrice);
      const avgCost = Number(invoiceItem.averageCostSnapshot ?? 0);
      const lineTotal = line.quantity * unitPrice;
      const lineCogs = line.quantity * avgCost;

      totalAmount += lineTotal;
      totalCogs += lineCogs;

      returnLines.push({
        originalInvoiceItemId: line.originalInvoiceItemId,
        productId: line.productId,
        quantity: line.quantity,
        unitPriceSnapshot: unitPrice,
        averageCostSnapshot: avgCost,
        lineTotal,
        notes: line.notes || null,
      });
    }

    // Generate return number
    const returnCount = await prisma.salesReturn.count({
      where: { companyId },
    });
    const returnNumber = `RET-${String(returnCount + 1).padStart(5, "0")}`;

    // Create return DRAFT inside transaction with audit
    const salesReturn = await prisma.$transaction(async (tx) => {
      const created = await tx.salesReturn.create({
        data: {
          companyId,
          returnNumber,
          originalInvoiceId,
          customerId,
          warehouseId,
          returnDate,
          currency,
          totalAmount,
          totalCogs,
          status: "DRAFT",
          notes,
          createdById: currentUser.userId,
          lines: { create: returnLines },
        },
        include: {
          lines: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: "CREATE",
          entity: "SalesReturn",
          entityId: created.id,
          details: {
            returnNumber,
            originalInvoiceId,
            totalAmount,
            totalCogs,
            lineCount: returnLines.length,
          } as never,
        },
      });

      return created;
    });

    return successResponse({
      id: salesReturn.id,
      returnNumber: salesReturn.returnNumber,
      status: salesReturn.status,
      totalAmount: Number(salesReturn.totalAmount),
      totalCogs: Number(salesReturn.totalCogs),
      lines: salesReturn.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name,
        quantity: l.quantity,
        lineTotal: Number(l.lineTotal),
      })),
      createdAt: salesReturn.createdAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "فشل إنشاء المرتجع";
    if (error instanceof Error && error.message.includes("Unique")) {
      return conflictError("رقم المرتجع مستخدم مسبقاً");
    }
    return errorResponse(message, 500);
  }
}
