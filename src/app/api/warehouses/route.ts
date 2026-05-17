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
  conflictError,
} from "@/lib/api-response";
import { warehouseFormSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.WAREHOUSES_VIEW)))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  // Build company-scoped filter
  let whereClause: Record<string, unknown> = {};

  if (companyId) {
    if (!(await canAccessCompany(user, companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }
    whereClause = { companyId };
  } else if (!isGlobalAdmin && dbUser?.companyId) {
    whereClause = { companyId: dbUser.companyId };
  }

  const warehouses = await prisma.warehouse.findMany({
    where: whereClause,
    include: { branch: { select: { name: true, code: true } } },
    orderBy: { name: "asc" },
  });

  return successResponse(warehouses);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.WAREHOUSES_CREATE)))
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = warehouseFormSchema.parse(body);

    if (!(await canAccessCompany(user, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Per-company duplicate code check
    const existingCode = await prisma.warehouse.findFirst({
      where: { companyId: parsed.companyId, code: parsed.code },
    });
    if (existingCode) {
      return conflictError("كود المخزن مستخدم مسبقاً في هذه الشركة");
    }

    // Per-company duplicate name check (optional but recommended)
    const existingName = await prisma.warehouse.findFirst({
      where: { companyId: parsed.companyId, name: parsed.name },
    });
    if (existingName) {
      return conflictError("اسم المخزن مستخدم مسبقاً في هذه الشركة");
    }

    // Branch validation: if branchId provided, must belong to same company and be active
    if (parsed.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: parsed.branchId },
        select: { companyId: true, isActive: true },
      });
      if (!branch) {
        return errorResponse("الفرع غير موجود", 404);
      }
      if (branch.companyId !== parsed.companyId) {
        return conflictError("الفرع لا ينتمي لنفس الشركة");
      }
      if (!branch.isActive) {
        return conflictError("الفرع غير نشط");
      }
    }

    const warehouse = await prisma.warehouse.create({
      data: parsed,
    });

    await logAudit(user.userId, "CREATE", "Warehouse", warehouse.id, {
      name: warehouse.name,
      code: warehouse.code,
      companyId: warehouse.companyId,
      branchId: warehouse.branchId,
    });

    return successResponse(warehouse, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل إنشاء المخزن", 500);
  }
}
