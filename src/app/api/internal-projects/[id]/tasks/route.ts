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
  conflictError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";
import {
  ProjectTaskStatus,
  ProjectTaskPriority,
} from "@/generated/prisma/client";

const createTaskSchema = z.object({
  code: z.string().min(1, "كود المهمة مطلوب"),
  title: z.string().min(1, "عنوان المهمة مطلوب"),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectTaskStatus).optional(),
  priority: z.nativeEnum(ProjectTaskPriority).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.TASKS_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!project) return notFoundError("المشروع غير موجود");
  if (!(await canAccessCompany(user, project.companyId)))
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeUserId = searchParams.get("assigneeUserId");

  const whereClause: Record<string, unknown> = { projectId: id };
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (assigneeUserId) {
    whereClause.assignments = {
      some: { assigneeUserId },
    };
  }

  const tasks = await prisma.projectTask.findMany({
    where: whereClause,
    include: {
      _count: { select: { assignments: true, childTasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse(tasks);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.TASKS_CREATE))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء مهمة");
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, companyId: true },
  });
  if (!project) return notFoundError("المشروع غير موجود");
  if (!(await canAccessCompany(currentUser, project.companyId)))
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");

  try {
    const body = await request.json();
    const parsed = createTaskSchema.parse(body);

    const existing = await prisma.projectTask.findUnique({
      where: { projectId_code: { projectId, code: parsed.code } },
    });
    if (existing) return conflictError("كود المهمة مستخدم مسبقاً في هذا المشروع");

    const task = await prisma.projectTask.create({
      data: {
        companyId: project.companyId,
        projectId,
        code: parsed.code,
        title: parsed.title,
        description: parsed.description || null,
        status: parsed.status || ProjectTaskStatus.TODO,
        priority: parsed.priority || ProjectTaskPriority.MEDIUM,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        parentTaskId: parsed.parentTaskId || null,
        createdById: currentUser.userId,
      },
    });

    await logAudit(currentUser.userId, "CREATE", "ProjectTask", task.id, {
      code: task.code,
      title: task.title,
      projectId,
    });

    return successResponse(task, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create task error:", error);
    return errorResponse("فشل إنشاء المهمة", 500);
  }
}
