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
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const updateWorkLogSchema = z.object({
  minutes: z.coerce
    .number()
    .int()
    .positive("الدقائق يجب أن تكون رقماً موجباً")
    .optional(),
  description: z.string().optional().nullable(),
  billable: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.WORKLOGS_EDIT))
  ) {
    return forbiddenError("لا تملك صلاحية تعديل تسجيل وقت");
  }

  const { id } = await params;
  const workLog = await prisma.workLog.findUnique({
    where: { id },
    include: { task: { select: { companyId: true } } },
  });
  if (!workLog) return notFoundError();

  if (!(await canAccessCompany(currentUser, workLog.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = updateWorkLogSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (parsed.minutes !== undefined) updateData.minutes = parsed.minutes;
    if (parsed.description !== undefined)
      updateData.description = parsed.description;
    if (parsed.billable !== undefined) updateData.billable = parsed.billable;
    updateData.updatedById = currentUser.userId;

    const updated = await prisma.workLog.update({
      where: { id },
      data: updateData,
    });

    await logAudit(currentUser.userId, "UPDATE", "WorkLog", id, {
      minutes: updated.minutes,
      billable: updated.billable,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث تسجيل الوقت", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.WORKLOGS_DELETE))
  ) {
    return forbiddenError("لا تملك صلاحية حذف تسجيل وقت");
  }

  const { id } = await params;
  const workLog = await prisma.workLog.findUnique({
    where: { id },
  });
  if (!workLog) return notFoundError();

  if (!(await canAccessCompany(currentUser, workLog.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  await prisma.workLog.delete({ where: { id } });

  await logAudit(currentUser.userId, "DELETE", "WorkLog", id, {
    taskId: workLog.taskId,
    minutes: workLog.minutes,
  });

  return successResponse({ id, action: "deleted" });
}
