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
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { employeeFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();
    if (!(await requireDbPermission(user.userId, PERMISSIONS.EMPLOYEES_VIEW)))
      return forbiddenError();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { companyId: true },
    });

    const isGlobalAdmin = await canAccessCompany(user, "any");

    const whereClause: Record<string, unknown> = {};

    if (companyId) {
      if (!(await canAccessCompany(user, companyId))) {
        return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
      }
      whereClause.companyId = companyId;
    } else if (!isGlobalAdmin && dbUser?.companyId) {
      whereClause.companyId = dbUser.companyId;
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    const data = employees.map((e) => ({
      id: e.id,
      companyId: e.companyId,
      code: e.code,
      name: e.name,
      phone: e.phone,
      email: e.email,
      address: e.address,
      position: e.position,
      isActive: e.isActive,
      notes: e.notes,
      createdAt: e.createdAt,
    }));

    return successResponse(data);
  } catch (error) {
    console.error("List employees error:", error);
    return errorResponse("فشل تحميل الموظفين", 500);
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.EMPLOYEES_CREATE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء موظف");
  }

  try {
    const body = await request.json();
    const parsed = employeeFormSchema.parse(body);

    if (!(await canAccessCompany(currentUser, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    const existingCode = await prisma.employee.findFirst({
      where: { companyId: parsed.companyId, code: parsed.code },
    });
    if (existingCode) {
      return conflictError("كود الموظف مستخدم مسبقاً في هذه الشركة");
    }

    const employee = await prisma.employee.create({
      data: {
        companyId: parsed.companyId,
        code: parsed.code,
        name: parsed.name,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
        position: parsed.position || null,
        notes: parsed.notes || null,
        isActive: parsed.isActive ?? true,
        createdById: currentUser.userId,
      },
    });

    await logAudit(currentUser.userId, "CREATE", "Employee", employee.id, {
      name: employee.name,
      code: employee.code,
      companyId: employee.companyId,
    });

    return successResponse(
      {
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
      },
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create employee error:", error);
    return errorResponse("فشل إنشاء الموظف", 500);
  }
}
