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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.CUSTOMERS_STATEMENT_VIEW,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية عرض كشف حساب العميل");
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { company: { select: { id: true, name: true } } },
  });

  if (!customer) return notFoundError();

  if (
    customer.companyId &&
    !(await canAccessCompany(user, customer.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  // Fetch posted invoices and collections for the period, scoped to customer currency
  const invoices = await prisma.invoice.findMany({
    where: {
      customerId: id,
      status: "POSTED",
      currency: customer.currency,
      ...(fromDate && { invoiceDate: { gte: fromDate } }),
      ...(toDate && { invoiceDate: { lte: toDate } }),
    },
    orderBy: { invoiceDate: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      totalAfterTax: true,
      paid: true,
      remaining: true,
      currency: true,
      paymentType: true,
    },
  });

  const collections = await prisma.customerCollection.findMany({
    where: {
      customerId: id,
      currency: customer.currency,
      ...(fromDate && { collectionDate: { gte: fromDate } }),
      ...(toDate && { collectionDate: { lte: toDate } }),
    },
    orderBy: { collectionDate: "asc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      collectionDate: true,
      invoiceId: true,
      notes: true,
    },
  });

  // Merge and sort transactions
  type Transaction = {
    id: string;
    date: Date;
    type: "INVOICE" | "COLLECTION";
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
      date: inv.invoiceDate,
      type: "INVOICE",
      reference: inv.invoiceNumber,
      description: `فاتورة بيع #${inv.invoiceNumber}`,
      debit: Number(inv.totalAfterTax),
      credit: 0,
      currency: inv.currency,
      balance: 0,
    });
  }

  for (const col of collections) {
    transactions.push({
      id: col.id,
      date: col.collectionDate,
      type: "COLLECTION",
      reference: "تحصيل",
      description: col.notes || `تحصيل #${col.id.slice(-6)}`,
      debit: 0,
      credit: Number(col.amount),
      currency: col.currency,
      balance: 0,
    });
  }

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  for (const t of transactions) {
    runningBalance += t.debit - t.credit;
    t.balance = runningBalance;
  }

  const totalInvoiced = transactions
    .filter((t) => t.type === "INVOICE")
    .reduce((sum, t) => sum + t.debit, 0);

  const totalCollected = transactions
    .filter((t) => t.type === "COLLECTION")
    .reduce((sum, t) => sum + t.credit, 0);

  return successResponse({
    customer: {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      currentBalance: Number(customer.currentBalance ?? 0),
      currency: customer.currency,
      company: customer.company,
    },
    period: {
      from: fromDate?.toISOString() || null,
      to: toDate?.toISOString() || null,
    },
    transactions: transactions.map((t) => ({
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
    summary: {
      totalInvoiced,
      totalCollected,
      endingBalance: runningBalance,
    },
  });
}
