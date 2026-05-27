import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessCompany } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const companyId = user.companyId;

  const companyFilter = companyId ? { companyId } : {};

  const [totalCustomers, totalProducts, totalInvoices, totalUsers] =
    await Promise.all([
      prisma.customer.count({
        where: { isActive: true, ...companyFilter },
      }),
      prisma.product.count({
        where: { isActive: true, ...companyFilter },
      }),
      prisma.invoice.count({
        where: { ...companyFilter },
      }),
      prisma.user.count({
        where: { isActive: true, ...companyFilter },
      }),
    ]);

  const totalSuppliers = await prisma.supplier.count({
    where: { isActive: true, ...companyFilter },
  });

  return successResponse({
    totalCustomers,
    totalSuppliers,
    totalProducts,
    totalInvoices,
    totalUsers,
  });
}
