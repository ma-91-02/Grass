import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  logAudit,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
} from "@/lib/api-response";
import { productCategoryFormSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.PRODUCT_CATEGORIES_VIEW,
    ))
  )
    return forbiddenError();

  // Load user's company scope
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  const categories = await prisma.productCategory.findMany({
    where:
      isGlobalAdmin || !dbUser?.companyId
        ? undefined
        : { companyId: dbUser.companyId },
    orderBy: { name: "asc" },
  });

  return successResponse(categories);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.PRODUCT_CATEGORIES_CREATE,
    ))
  )
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = productCategoryFormSchema.parse(body);

    if (!(await canAccessCompany(user, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Duplicate check per company
    if (parsed.code) {
      const existing = await prisma.productCategory.findFirst({
        where: { companyId: parsed.companyId, code: parsed.code },
      });
      if (existing) {
        return conflictError("كود التصنيف مستخدم مسبقاً في هذه الشركة");
      }
    }

    const existingName = await prisma.productCategory.findFirst({
      where: { companyId: parsed.companyId, name: parsed.name },
    });
    if (existingName) {
      return conflictError("اسم التصنيف موجود مسبقاً في هذه الشركة");
    }

    const category = await prisma.productCategory.create({
      data: parsed,
    });

    await logAudit(user.userId, "CREATE", "ProductCategory", category.id, {
      name: category.name,
      companyId: category.companyId,
    });

    return successResponse(category, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل إنشاء التصنيف", 500);
  }
}
