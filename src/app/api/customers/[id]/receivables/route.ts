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

  return successResponse({
    customer: {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      currentBalance: Number(customer.currentBalance ?? 0),
      creditLimit: Number(customer.creditLimit ?? 0),
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
    },
  });
}
