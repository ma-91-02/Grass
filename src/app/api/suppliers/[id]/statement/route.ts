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
import { Currency } from "@/generated/prisma/enums";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.SUPPLIERS_STATEMENT_VIEW,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية عرض كشف حساب المورد");
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const currencyParam = searchParams.get("currency");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  let page = parseInt(pageParam || "1", 10);
  let limit = parseInt(limitParam || "50", 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 1;
  if (limit > 200) limit = 200;

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;
  const currency = currencyParam || undefined;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { company: { select: { id: true, name: true } } },
  });

  if (!supplier) return notFoundError();

  if (
    supplier.companyId &&
    !(await canAccessCompany(user, supplier.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  // Fetch all purchase invoices for this supplier
  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      supplierId: id,
      ...(currency && { currency: currency as Currency }),
      ...(fromDate && { purchaseDate: { gte: fromDate } }),
      ...(toDate && { purchaseDate: { lte: toDate } }),
    },
    orderBy: { purchaseDate: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      purchaseDate: true,
      totalCost: true,
      paid: true,
      remaining: true,
      currency: true,
      notes: true,
    },
  });

  type Transaction = {
    id: string;
    date: Date;
    type: "PURCHASE" | "PAYMENT";
    reference: string;
    description: string;
    debit: number;
    credit: number;
    currency: string;
    balance: number;
  };

  const transactions: Transaction[] = [];

  for (const inv of invoices) {
    transactions.push({
      id: inv.id,
      date: inv.purchaseDate,
      type: "PURCHASE",
      reference: inv.invoiceNumber,
      description: `فاتورة شراء #${inv.invoiceNumber}`,
      debit: Number(inv.totalCost),
      credit: 0,
      currency: inv.currency,
      balance: 0,
    });

    // If partially paid, add a synthetic payment transaction from the paid amount
    // (We don't have a supplier payment model, so we infer from paid difference)
    if (Number(inv.paid) > 0) {
      transactions.push({
        id: `${inv.id}-payment`,
        date: inv.purchaseDate,
        type: "PAYMENT",
        reference: inv.invoiceNumber,
        description: `دفعة على فاتورة #${inv.invoiceNumber}`,
        debit: 0,
        credit: Number(inv.paid),
        currency: inv.currency,
        balance: 0,
      });
    }
  }

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  for (const t of transactions) {
    runningBalance += t.debit - t.credit;
    t.balance = runningBalance;
  }

  const totalPurchased = transactions
    .filter((t) => t.type === "PURCHASE")
    .reduce((sum, t) => sum + t.debit, 0);

  const totalPaid = transactions
    .filter((t) => t.type === "PAYMENT")
    .reduce((sum, t) => sum + t.credit, 0);

  const totalTransactions = transactions.length;
  const skip = (page - 1) * limit;
  const paginatedTransactions = transactions.slice(skip, skip + limit);

  return successResponse({
    supplier: {
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      company: supplier.company,
    },
    period: {
      from: fromDate?.toISOString() || null,
      to: toDate?.toISOString() || null,
    },
    transactions: paginatedTransactions.map((t) => ({
      id: t.id,
      date: t.date,
      type: t.type,
      reference: t.reference,
      description: t.description,
      debit: t.debit,
      credit: t.credit,
      currency: t.currency,
      balance: t.balance,
    })),
    pagination: {
      page,
      limit,
      total: totalTransactions,
      totalPages: Math.ceil(totalTransactions / limit),
    },
    summary: {
      totalPurchased,
      totalPaid,
      endingBalance: runningBalance,
    },
  });
}
