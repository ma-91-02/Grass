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
import { ProjectTaskStatus } from "@/generated/prisma/client";

const statusSchema = z.object({
  status: z.nativeEnum(ProjectTaskStatus, {
    message: "حالة المهمة غير صالحة",
  }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.TASKS_STATUS))
  ) {
    return forbiddenError("لا تملك صلاحية تغيير حالة المهمة");
  }

  const { id } = await params;
  const task = await prisma.projectTask.findUnique({
    where: { id },
    include: { project: { select: { companyId: true } } },
  });
  if (!task) return notFoundError();

  if (!(await canAccessCompany(currentUser, task.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = statusSchema.parse(body);

    const updateData: Record<string, unknown> = {
      status: parsed.status,
      updatedById: currentUser.userId,
    };

    if (parsed.status === ProjectTaskStatus.DONE) {
      updateData.completedAt = new Date();
    } else if (task.completedAt) {
      updateData.completedAt = null;
    }

    const updated = await prisma.projectTask.update({
      where: { id },
      data: updateData,
    });

    await logAudit(currentUser.userId, "STATUS_CHANGE", "ProjectTask", id, {
      from: task.status,
      to: parsed.status,
      code: task.code,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تغيير حالة المهمة", 500);
  }
}
