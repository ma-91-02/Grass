import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  logAudit,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  serverError,
} from "@/lib/api-response";
import { branchFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.BRANCHES_VIEW)))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  // Load user's company scope from DB (not stale JWT)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });
  const effectiveCompanyId = companyId || dbUser?.companyId;

  if (!effectiveCompanyId) {
    return successResponse([]);
  }

  if (!(await canAccessCompany(user, effectiveCompanyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const branches = await prisma.branch.findMany({
    where: { companyId: effectiveCompanyId },
    orderBy: { name: "asc" },
  });

  return successResponse(branches);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.BRANCHES_CREATE)))
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = branchFormSchema.parse(body);

    if (!(await canAccessCompany(user, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    const company = await prisma.company.findUnique({
      where: { id: parsed.companyId },
    });
    if (!company) return errorResponse("الشركة غير موجودة", 404);

    const existing = await prisma.branch.findUnique({
      where: {
        companyId_code: { companyId: parsed.companyId, code: parsed.code },
      },
    });
    if (existing) return errorResponse("كود الفرع موجود مسبقاً للشركة", 409);

    const branch = await prisma.branch.create({
      data: {
        companyId: parsed.companyId,
        name: parsed.name,
        code: parsed.code,
        address: parsed.address || null,
        phone: parsed.phone || null,
      },
    });

    await logAudit(user.userId, "CREATE", "Branch", branch.id, {
      code: branch.code,
      name: branch.name,
      companyId: branch.companyId,
    });

    return successResponse(branch, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return serverError(error);
  }
}
