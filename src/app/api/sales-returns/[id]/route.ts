import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

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
