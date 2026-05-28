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
  if (!(await requireDbPermission(user.userId, PERMISSIONS.REPORTS_VIEW)))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const asOfDate = searchParams.get("asOf");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");
  const effectiveCompanyId =
    companyId ||
    (!isGlobalAdmin && dbUser?.companyId ? dbUser.companyId : null);

  if (
    effectiveCompanyId &&
    !(await canAccessCompany(user, effectiveCompanyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();

    const where: Record<string, unknown> = {
      status: "POSTED",
      remaining: { gt: 0 },
    };
    if (effectiveCompanyId) where.companyId = effectiveCompanyId;

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        totalAfterTax: true,
        paid: true,
        remaining: true,
        currency: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { invoiceDate: "asc" },
    });

    const buckets = {
      current: { label: "0-30 يوم", total: 0, invoices: [] as unknown[] },
      overdue30: { label: "31-60 يوم", total: 0, invoices: [] as unknown[] },
      overdue60: { label: "61-90 يوم", total: 0, invoices: [] as unknown[] },
      overdue90: { label: "أكثر من 90 يوم", total: 0, invoices: [] as unknown[] },
    };

    for (const inv of invoices) {
      const daysDiff = Math.floor(
        (asOf.getTime() - new Date(inv.invoiceDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const remaining = Number(inv.remaining);
      const entry = {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        customerId: inv.customer?.id,
        customerName: inv.customer?.name || "-",
        remaining,
        currency: inv.currency,
      };

      if (daysDiff <= 30) {
        buckets.current.total += remaining;
        buckets.current.invoices.push(entry);
      } else if (daysDiff <= 60) {
        buckets.overdue30.total += remaining;
        buckets.overdue30.invoices.push(entry);
      } else if (daysDiff <= 90) {
        buckets.overdue60.total += remaining;
        buckets.overdue60.invoices.push(entry);
      } else {
        buckets.overdue90.total += remaining;
        buckets.overdue90.invoices.push(entry);
      }
    }

    const grandTotal =
      buckets.current.total +
      buckets.overdue30.total +
      buckets.overdue60.total +
      buckets.overdue90.total;

    return successResponse({
      asOf: asOf.toISOString(),
      buckets,
      grandTotal,
      totalInvoices: invoices.length,
    });
  } catch (error) {
    console.error("AR Aging error:", error);
    return errorResponse("فشل إنشاء تقرير أعمار الذمم", 500);
  }
}
