import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
  logAudit,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  serverError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const VALID_TRANSITIONS: Record<string, string[]> = {
  FUTURE: ["OPEN"],
  OPEN: ["CLOSING_IN_PROGRESS"],
  CLOSING_IN_PROGRESS: ["SOFT_CLOSED"],
  SOFT_CLOSED: ["HARD_CLOSED"],
  HARD_CLOSED: [],
};

const statusTransitionSchema = z.object({
  status: z.enum([
    "FUTURE",
    "OPEN",
    "CLOSING_IN_PROGRESS",
    "SOFT_CLOSED",
    "HARD_CLOSED",
  ]),
});

const updateFiscalPeriodSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.FISCAL_PERIODS_VIEW)))
    return forbiddenError();

  const { id } = await params;

  const period = await prisma.fiscalPeriod.findUnique({ where: { id } });
  if (!period) return notFoundError();
  if (!canAccessCompany(user, period.companyId))
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");

  return successResponse(period);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.FISCAL_PERIODS_MANAGE)))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.fiscalPeriod.findUnique({ where: { id } });
  if (!existing) return notFoundError();
  if (!canAccessCompany(user, existing.companyId))
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");

  try {
    const body = await request.json();

    if (body.status) {
      const parsedStatus = statusTransitionSchema.parse(body);
      const allowed = VALID_TRANSITIONS[existing.status] || [];

      if (!allowed.includes(parsedStatus.status)) {
        return errorResponse(
          `لا يمكن الانتقال من ${existing.status} إلى ${parsedStatus.status}`,
        );
      }

      const period = await prisma.fiscalPeriod.update({
        where: { id },
        data: { status: parsedStatus.status as never },
      });

      await logAudit(user.userId, "UPDATE_STATUS", "FiscalPeriod", id, {
        from: existing.status,
        to: parsedStatus.status,
      });

      return successResponse(period);
    }

    const parsed = updateFiscalPeriodSchema.parse(body);

    if (parsed.startDate || parsed.endDate) {
      const startDate = parsed.startDate
        ? new Date(parsed.startDate)
        : existing.startDate;
      const endDate = parsed.endDate
        ? new Date(parsed.endDate)
        : existing.endDate;

      if (startDate >= endDate)
        return errorResponse("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");

      const overlapping = await prisma.fiscalPeriod.findFirst({
        where: {
          companyId: existing.companyId,
          branchId: existing.branchId,
          id: { not: id },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });
      if (overlapping)
        return errorResponse(
          "الفترة المالية تتداخل مع فترة موجودة مسبقاً",
          409,
        );
    }

    const period = await prisma.fiscalPeriod.update({
      where: { id },
      data: {
        ...(parsed.name ? { name: parsed.name } : {}),
        ...(parsed.startDate ? { startDate: new Date(parsed.startDate) } : {}),
        ...(parsed.endDate ? { endDate: new Date(parsed.endDate) } : {}),
      },
    });

    await logAudit(user.userId, "UPDATE", "FiscalPeriod", id, {
      name: period.name,
    });

    return successResponse(period);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return serverError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.FISCAL_PERIODS_MANAGE)))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.fiscalPeriod.findUnique({ where: { id } });
  if (!existing) return notFoundError();
  if (!canAccessCompany(user, existing.companyId))
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");

  if (existing.status !== "FUTURE")
    return errorResponse("يمكن حذف الفترات المستقبلية فقط");

  const journalCount = await prisma.journalEntry.count({
    where: { fiscalPeriodId: id },
  });

  if (journalCount > 0) {
    return errorResponse(
      "لا يمكن حذف الفترة المالية لوجود قيود يومية مرتبطة بها",
      409,
    );
  }

  await prisma.fiscalPeriod.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "FiscalPeriod", id, {
    name: existing.name,
    wasPermanent: true,
  });

  return successResponse({
    action: "deleted",
    fiscalPeriodId: id,
  });
}
