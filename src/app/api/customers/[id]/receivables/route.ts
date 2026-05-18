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
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.CUSTOMERS_RECEIVABLES_VIEW,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية عرض مستحقات العميل");
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      invoices: {
        where: { status: "POSTED", remaining: { gt: 0 } },
        orderBy: { invoiceDate: "desc" },
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
      },
    },
  });

  if (!customer) return notFoundError();

  if (
    customer.companyId &&
    !(await canAccessCompany(user, customer.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const totalReceivable = customer.invoices.reduce(
    (sum, inv) => sum + Number(inv.remaining),
    0,
  );

  const creditLimit = Number(customer.creditLimit ?? 0);
  const currentBalance = Number(customer.currentBalance ?? 0);
  const availableCredit =
    creditLimit > 0 ? Math.max(0, creditLimit - currentBalance) : null;

  // Overdue: POSTED invoices with remaining > 0 and invoiceDate > 30 days ago
  const now = new Date();
  const overdueThreshold = new Date(now.setDate(now.getDate() - 30));
  const overdueCount = customer.invoices.filter(
    (inv) =>
      Number(inv.remaining) > 0 && new Date(inv.invoiceDate) < overdueThreshold,
  ).length;

  return successResponse({
    customer: {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      currentBalance,
      creditLimit,
      availableCredit,
      currency: customer.currency,
      company: customer.company,
    },
    invoices: customer.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      totalAfterTax: Number(inv.totalAfterTax),
      paid: Number(inv.paid),
      remaining: Number(inv.remaining),
      currency: inv.currency,
      paymentType: inv.paymentType,
    })),
    summary: {
      invoiceCount: customer.invoices.length,
      totalReceivable,
      overdueCount,
    },
  });
}
