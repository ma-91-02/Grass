import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  serverError,
} from "@/lib/api-response";
import { fiscalPeriodFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.FISCAL_PERIODS_VIEW))
    return unauthorizedError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) return errorResponse("companyId مطلوب");

  const periods = await prisma.fiscalPeriod.findMany({
    where: { companyId },
    orderBy: { startDate: "desc" },
  });

  return successResponse(periods);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.FISCAL_PERIODS_MANAGE))
    return unauthorizedError();

  try {
    const body = await request.json();
    const parsed = fiscalPeriodFormSchema.parse(body);

    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);

    if (startDate >= endDate)
      return errorResponse("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");

    const overlapping = await prisma.fiscalPeriod.findFirst({
      where: {
        companyId: parsed.companyId,
        branchId: parsed.branchId || null,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping)
      return errorResponse("الفترة المالية تتداخل مع فترة موجودة مسبقاً", 409);

    const period = await prisma.fiscalPeriod.create({
      data: {
        companyId: parsed.companyId,
        branchId: parsed.branchId || null,
        name: parsed.name,
        startDate,
        endDate,
        status: "FUTURE",
      },
    });

    await logAudit(user.userId, "CREATE", "FiscalPeriod", period.id, {
      name: period.name,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
    });

    return successResponse(period, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return serverError(error);
  }
}
