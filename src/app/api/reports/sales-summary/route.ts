import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.REPORTS_VIEW))
  )
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  const effectiveCompanyId =
    companyId ||
    (!isGlobalAdmin && dbUser?.companyId ? dbUser.companyId : null);

  if (effectiveCompanyId && !(await canAccessCompany(user, effectiveCompanyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const where: Record<string, unknown> = { status: "POSTED" };
    if (effectiveCompanyId) where.companyId = effectiveCompanyId;
    if (fromDate) where.invoiceDate = { ...(where.invoiceDate as Record<string, unknown> || {}), gte: new Date(fromDate) };
    if (toDate) where.invoiceDate = { ...(where.invoiceDate as Record<string, unknown> || {}), lte: new Date(toDate) };

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        totalAfterTax: true,
        totalBeforeTax: true,
        taxAmount: true,
        discountAmount: true,
        paid: true,
        remaining: true,
        currency: true,
        paymentType: true,
        customer: { select: { name: true } },
      },
      orderBy: { invoiceDate: "desc" },
    });

    const summary = {
      totalInvoices: invoices.length,
      totalSales: invoices.reduce((s, i) => s + Number(i.totalAfterTax ?? 0), 0),
      totalTax: invoices.reduce((s, i) => s + Number(i.taxAmount ?? 0), 0),
      totalDiscount: invoices.reduce((s, i) => s + Number(i.discountAmount ?? 0), 0),
      totalPaid: invoices.reduce((s, i) => s + Number(i.paid ?? 0), 0),
      totalRemaining: invoices.reduce((s, i) => s + Number(i.remaining ?? 0), 0),
      byPaymentType: {
        CASH: invoices.filter((i) => i.paymentType === "CASH").length,
        CREDIT: invoices.filter((i) => i.paymentType === "CREDIT").length,
        MIXED: invoices.filter((i) => i.paymentType === "MIXED").length,
      },
      currency: invoices.length > 0 ? invoices[0].currency : "IQD",
    };

    return successResponse({ summary, invoices });
  } catch (error) {
    console.error("Sales summary error:", error);
    return errorResponse("فشل إنشاء تقرير المبيعات", 500);
  }
}
