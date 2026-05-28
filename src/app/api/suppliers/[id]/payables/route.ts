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
      PERMISSIONS.SUPPLIERS_PAYABLES_VIEW,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية عرض مستحقات المورد");
  }

  const { id } = await params;
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

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { supplierId: id, remaining: { gt: 0 } },
    orderBy: { purchaseDate: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      purchaseDate: true,
      totalCost: true,
      paid: true,
      remaining: true,
      currency: true,
    },
  });

  const totalPayable = invoices.reduce(
    (sum, inv) => sum + Number(inv.remaining),
    0,
  );

  const now = new Date();
  const overdueThreshold = new Date(now.setDate(now.getDate() - 30));
  const overdueCount = invoices.filter(
    (inv) =>
      Number(inv.remaining) > 0 && new Date(inv.purchaseDate) < overdueThreshold,
  ).length;

  // Also get account balances
  const accounts = await prisma.supplierAccount.findMany({
    where: { supplierId: id },
  });

  return successResponse({
    supplier: {
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      company: supplier.company,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      currency: a.currency,
      balance: Number(a.balance),
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      purchaseDate: inv.purchaseDate,
      totalCost: Number(inv.totalCost),
      paid: Number(inv.paid),
      remaining: Number(inv.remaining),
      currency: inv.currency,
    })),
    summary: {
      invoiceCount: invoices.length,
      totalPayable,
      overdueCount,
    },
  });
}
