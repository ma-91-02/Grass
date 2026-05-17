import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  serverError,
} from "@/lib/api-response";
import { branchFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.BRANCHES_VIEW))
    return unauthorizedError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  const where = companyId ? { companyId } : {};

  const branches = await prisma.branch.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return successResponse(branches);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.BRANCHES_CREATE))
    return unauthorizedError();

  try {
    const body = await request.json();
    const parsed = branchFormSchema.parse(body);

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
