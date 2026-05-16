import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, checkPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const { id } = await params;
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      warehouse: { select: { name: true } },
      paymentAccount: { select: { name: true } },
      items: true,
      expenses: true,
    },
  });

  if (!invoice) return notFoundError("فاتورة المشتريات غير موجودة");

  return successResponse({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    supplierInvoiceNumber: invoice.supplierInvoiceNumber,
    purchaseDate: invoice.purchaseDate,
    currency: invoice.currency,
    exchangeRateValue: Number(invoice.exchangeRateValue),
    supplierId: invoice.supplierId,
    supplierName: invoice.supplier?.name || null,
    warehouseId: invoice.warehouseId,
    warehouseName: invoice.warehouse?.name || null,
    notes: invoice.notes,
    subtotal: Number(invoice.subtotal),
    totalExpenses: Number(invoice.totalExpenses),
    totalCost: Number(invoice.totalCost),
    paymentMethod: invoice.paymentMethod,
    paid: Number(invoice.paid),
    remaining: Number(invoice.remaining),
    paymentAccountId: invoice.paymentAccountId,
    paymentAccountName: invoice.paymentAccount?.name || null,
    status: invoice.status,
    items: invoice.items.map((item) => ({
      id: item.id,
      purchaseInvoiceId: item.purchaseInvoiceId,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.quantity,
      purchasePrice: Number(item.purchasePrice),
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      totalPrice: Number(item.totalPrice),
    })),
    expenses: invoice.expenses.map((exp) => ({
      id: exp.id,
      purchaseInvoiceId: exp.purchaseInvoiceId,
      name: exp.name,
      amount: Number(exp.amount),
    })),
    createdById: invoice.createdById,
    createdAt: invoice.createdAt,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!checkPermission(currentUser, PERMISSIONS.PURCHASES_DELETE)) {
    return forbiddenError("لا تملك صلاحية حذف فاتورة مشتريات");
  }

  try {
    const { id } = await params;
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) return notFoundError("فاتورة المشتريات غير موجودة");

    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({
        where: { referenceType: "PURCHASE_INVOICE", referenceId: id },
      });

      await tx.purchaseExpense.deleteMany({ where: { purchaseInvoiceId: id } });
      await tx.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoiceId: id } });

      if (invoice.paymentMethod !== "CREDIT" && Number(invoice.paid) > 0 && invoice.paymentAccountId) {
        const account = await tx.paymentAccount.findUnique({
          where: { id: invoice.paymentAccountId },
        });
        if (account) {
          const newBalance = Number(account.balance) - Number(invoice.paid);
          await tx.paymentAccount.update({
            where: { id: invoice.paymentAccountId },
            data: { balance: newBalance },
          });
        }
      }

      await tx.purchaseInvoice.delete({ where: { id } });
    });

    try {
      await logAudit(currentUser.userId, "DELETE", "PurchaseInvoice", id, {
        invoiceNumber: invoice.invoiceNumber,
      });
    } catch {
      console.error("Audit log failed for purchase invoice delete");
    }

    return successResponse({ id });
  } catch (error) {
    console.error("Delete purchase invoice error:", error);
    return errorResponse("فشل حذف فاتورة المشتريات", 500);
  }
}
