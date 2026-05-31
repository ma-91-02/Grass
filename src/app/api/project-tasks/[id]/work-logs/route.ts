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

const createWorkLogSchema = z.object({
  minutes: z.coerce.number().int().positive("الدقائق يجب أن تكون رقماً موجباً"),
  description: z.string().optional().nullable(),
  workDate: z.string().optional().nullable(),
  billable: z.boolean().optional().default(false),
  userId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.WORKLOGS_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const task = await prisma.projectTask.findUnique({
    where: { id },
    select: { id: true, companyId: true, projectId: true },
  });
  if (!task) return notFoundError("المهمة غير موجودة");

  if (!(await canAccessCompany(user, task.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const workLogs = await prisma.workLog.findMany({
    where: { taskId: id },
    include: {
      user: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true, code: true } },
    },
    orderBy: { workDate: "desc" },
  });

  return successResponse(workLogs);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.WORKLOGS_CREATE))
  ) {
    return forbiddenError("لا تملك صلاحية إضافة تسجيل وقت");
  }

  const { id: taskId } = await params;
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, companyId: true, projectId: true },
  });
  if (!task) return notFoundError("المهمة غير موجودة");

  if (!(await canAccessCompany(currentUser, task.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = createWorkLogSchema.parse(body);

    const workLog = await prisma.workLog.create({
      data: {
        companyId: task.companyId,
        projectId: task.projectId,
        taskId,
        minutes: parsed.minutes,
        description: parsed.description || null,
        workDate: parsed.workDate ? new Date(parsed.workDate) : new Date(),
        billable: parsed.billable,
        userId: parsed.userId || null,
        employeeId: parsed.employeeId || null,
        createdById: currentUser.userId,
      },
      include: {
        user: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true, code: true } },
      },
    });

    await logAudit(currentUser.userId, "CREATE", "WorkLog", workLog.id, {
      taskId,
      minutes: parsed.minutes,
      workDate: workLog.workDate,
    });

    return successResponse(workLog, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create work log error:", error);
    return errorResponse("فشل إنشاء تسجيل الوقت", 500);
  }
}
