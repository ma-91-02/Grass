import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, requireDbPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

const categorySchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();

    const categories = await prisma.customerCategory.findMany({
      include: { _count: { select: { customers: true } } },
      orderBy: { name: "asc" },
    });

    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      customerCount: c._count.customers,
      createdAt: c.createdAt,
    }));

    return successResponse(data);
  } catch (error) {
    console.error("GET customer-categories error:", error);
    return errorResponse("فشل تحميل الأقسام", 500);
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!(await requireDbPermission(currentUser.userId, PERMISSIONS.CUSTOMER_CATEGORIES_CREATE))) {
    return forbiddenError("لا تملك صلاحية إنشاء قسم");
  }

  try {
    const body = await request.json();
    const parsed = categorySchema.parse(body);

    const existing = await prisma.customerCategory.findUnique({
      where: { name: parsed.name },
    });
    if (existing) {
      return conflictError("القسم موجود مسبقاً");
    }

    const category = await prisma.customerCategory.create({
      data: parsed,
    });

    try {
      await logAudit(
        currentUser.userId,
        "CREATE",
        "CustomerCategory",
        category.id,
        { name: category.name },
      );
    } catch {
      console.error("Audit log failed for category create");
    }

    return successResponse({ ...category, customerCount: 0 }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create customer category error:", error);
    return errorResponse("فشل إنشاء القسم", 500);
  }
}
