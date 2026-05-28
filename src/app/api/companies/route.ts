import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  logAudit,
  requireDbPermission,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  serverError,
} from "@/lib/api-response";
import { companyFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.COMPANIES_VIEW)))
    return forbiddenError();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await requireDbPermission(
    user.userId,
    PERMISSIONS.SETTINGS_MANAGE,
  );

  if (!isGlobalAdmin && !dbUser?.companyId) {
    return successResponse([]);
  }

  const companyId = dbUser?.companyId;
  const companies = await prisma.company.findMany({
    where: isGlobalAdmin ? undefined : { id: companyId! },
    orderBy: { name: "asc" },
  });

  return successResponse(companies);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.COMPANIES_CREATE)))
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = companyFormSchema.parse(body);

    const existing = await prisma.company.findUnique({
      where: { code: parsed.code },
    });
    if (existing) return errorResponse("كود الشركة موجود مسبقاً", 409);

    const company = await prisma.company.create({
      data: parsed,
    });

    await logAudit(user.userId, "CREATE", "Company", company.id, {
      code: company.code,
      name: company.name,
    });

    return successResponse(company, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return serverError(error);
  }
}
