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
import {
  ProjectTaskStatus,
  ProjectTaskPriority,
} from "@/generated/prisma/client";

const updateTaskSchema = z.object({
  code: z.string().min(1, "كود المهمة مطلوب").optional(),
  title: z.string().min(1, "عنوان المهمة مطلوب").optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectTaskStatus).optional(),
  priority: z.nativeEnum(ProjectTaskPriority).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.TASKS_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const task = await prisma.projectTask.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, code: true, name: true, companyId: true } },
      parentTask: { select: { id: true, title: true, code: true } },
      _count: { select: { assignments: true, childTasks: true, workLogs: true } },
    },
  });
  if (!task) return notFoundError();

  if (!(await canAccessCompany(user, task.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse({
    id: task.id,
    companyId: task.companyId,
    projectId: task.projectId,
    projectCode: task.project.code,
    projectName: task.project.name,
    code: task.code,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    parentTaskId: task.parentTaskId,
    parentTaskTitle: task.parentTask?.title || null,
    assignmentCount: task._count.assignments,
    childTaskCount: task._count.childTasks,
    workLogCount: task._count.workLogs,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.TASKS_EDIT))
  ) {
    return forbiddenError("لا تملك صلاحية تعديل مهمة");
  }

  const { id } = await params;
  const existing = await prisma.projectTask.findUnique({
    where: { id },
    include: { project: { select: { companyId: true } } },
  });
  if (!existing) return notFoundError();

  if (!(await canAccessCompany(currentUser, existing.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = updateTaskSchema.parse(body);

    if (parsed.code && parsed.code !== existing.code) {
      const duplicate = await prisma.projectTask.findUnique({
        where: { projectId_code: { projectId: existing.projectId, code: parsed.code } },
      });
      if (duplicate) {
        return errorResponse("كود المهمة مستخدم مسبقاً في هذا المشروع", 409);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.code !== undefined) updateData.code = parsed.code;
    if (parsed.title !== undefined) updateData.title = parsed.title;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.status !== undefined) updateData.status = parsed.status;
    if (parsed.priority !== undefined) updateData.priority = parsed.priority;
    if (parsed.startDate !== undefined) updateData.startDate = parsed.startDate ? new Date(parsed.startDate) : null;
    if (parsed.dueDate !== undefined) updateData.dueDate = parsed.dueDate ? new Date(parsed.dueDate) : null;
    if (parsed.parentTaskId !== undefined) updateData.parentTaskId = parsed.parentTaskId;
    updateData.updatedById = currentUser.userId;

    if (parsed.status === ProjectTaskStatus.DONE) {
      updateData.completedAt = new Date();
    }

    const task = await prisma.projectTask.update({
      where: { id },
      data: updateData,
    });

    await logAudit(currentUser.userId, "UPDATE", "ProjectTask", id, {
      code: task.code,
      title: task.title,
    });

    return successResponse(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث المهمة", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.TASKS_DELETE))
  ) {
    return forbiddenError("لا تملك صلاحية حذف مهمة");
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

  if (task.status !== ProjectTaskStatus.TODO) {
    return forbiddenError("يمكن حذف المهام في حالة TODO فقط");
  }

  await prisma.projectTask.delete({ where: { id } });

  await logAudit(currentUser.userId, "DELETE", "ProjectTask", id, {
    code: task.code,
    title: task.title,
  });

  return successResponse({ id, action: "deleted" });
}
