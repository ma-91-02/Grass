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
import { unitSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.UNITS_VIEW)))
    return forbiddenError();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  const units = await prisma.unit.findMany({
    where:
      isGlobalAdmin || !dbUser?.companyId
        ? undefined
        : { companyId: dbUser.companyId },
    orderBy: { name: "asc" },
  });

  return successResponse(units);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.UNITS_CREATE)))
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = unitSchema.parse(body);

    if (!(await canAccessCompany(user, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Duplicate code check per company
    const existing = await prisma.unit.findFirst({
      where: { companyId: parsed.companyId, code: parsed.code },
    });
    if (existing) {
      return conflictError("كود الوحدة مستخدم مسبقاً في هذه الشركة");
    }

    const unit = await prisma.unit.create({
      data: parsed,
    });

    await logAudit(user.userId, "CREATE", "Unit", unit.id, {
      name: unit.name,
      companyId: unit.companyId,
    });

    return successResponse(unit, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل إنشاء الوحدة", 500);
  }
}
