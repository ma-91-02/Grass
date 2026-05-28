import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  logAudit,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { employeeUpdateSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();
    if (!(await requireDbPermission(user.userId, PERMISSIONS.EMPLOYEES_VIEW)))
      return forbiddenError();

    const { id } = await params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return notFoundError("الموظف غير موجود");

    if (
      employee.companyId &&
      !(await canAccessCompany(user, employee.companyId))
    ) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    return successResponse({
      id: employee.id,
      companyId: employee.companyId,
      code: employee.code,
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      address: employee.address,
      position: employee.position,
      isActive: employee.isActive,
      notes: employee.notes,
      createdAt: employee.createdAt,
    });
  } catch (error) {
    console.error("Get employee error:", error);
    return errorResponse("فشل تحميل الموظف", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.EMPLOYEES_EDIT))
  ) {
    return forbiddenError("لا تملك صلاحية تعديل موظف");
  }

  const { id } = await params;
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return notFoundError("الموظف غير موجود");

  if (
    existing.companyId &&
    !(await canAccessCompany(currentUser, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = employeeUpdateSchema.parse(body);

    const targetCompanyId = parsed.companyId ?? existing.companyId;
    if (
      parsed.companyId &&
      !(await canAccessCompany(currentUser, parsed.companyId))
    ) {
      return forbiddenError("لا يمكنك نقل الموظف إلى هذه الشركة");
    }

    const targetCode = parsed.code ?? existing.code;
    if (targetCompanyId) {
      const duplicateCode = await prisma.employee.findFirst({
        where: {
          companyId: targetCompanyId,
          code: targetCode,
          id: { not: id },
        },
      });
      if (duplicateCode) {
        return conflictError("كود الموظف مستخدم مسبقاً في هذه الشركة");
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        companyId: parsed.companyId,
        code: parsed.code,
        name: parsed.name,
        phone: parsed.phone === undefined ? undefined : parsed.phone || null,
        email: parsed.email === undefined ? undefined : parsed.email || null,
        address:
          parsed.address === undefined ? undefined : parsed.address || null,
        position:
          parsed.position === undefined ? undefined : parsed.position || null,
        notes: parsed.notes === undefined ? undefined : parsed.notes || null,
        isActive: parsed.isActive,
      },
    });

    await logAudit(currentUser.userId, "UPDATE", "Employee", id, {
      name: employee.name,
      code: employee.code,
    });

    return successResponse({
      id: employee.id,
      companyId: employee.companyId,
      code: employee.code,
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      address: employee.address,
      position: employee.position,
      isActive: employee.isActive,
      notes: employee.notes,
      createdAt: employee.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Update employee error:", error);
    return errorResponse("فشل تحديث الموظف", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.EMPLOYEES_DELETE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية حذف موظف");
  }

  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return notFoundError("الموظف غير موجود");

  if (
    employee.companyId &&
    !(await canAccessCompany(currentUser, employee.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  await prisma.employee.delete({ where: { id } });

  await logAudit(currentUser.userId, "DELETE", "Employee", id, {
    name: employee.name,
    code: employee.code,
  });

  return successResponse({ id, action: "deleted" });
}
