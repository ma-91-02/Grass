import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  conflictError,
} from "@/lib/api-response";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const { id } = await params;

  const category = await prisma.productCategory.findUnique({
    where: { id },
  });

  if (!category) return notFoundError();

  const productsCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productsCount > 0) {
    return conflictError("لا يمكن حذف هذه المجموعة لأنها مستخدمة في مواد.");
  }

  await prisma.productCategory.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "ProductCategory", id, {
    name: category.name,
  });

  return successResponse({ id });
}
