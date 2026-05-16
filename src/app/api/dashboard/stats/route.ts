import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const [totalCustomers, totalProducts, totalInvoices, totalUsers] =
    await Promise.all([
      prisma.customer.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.invoice.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

  return successResponse({
    totalCustomers,
    totalProducts,
    totalInvoices,
    totalUsers,
  });
}
