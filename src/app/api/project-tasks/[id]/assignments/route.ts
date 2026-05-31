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
import { AssignmentStatus } from "@/generated/prisma/client";

const createAssignmentSchema = z
  .object({
    assigneeUserId: z.string().optional().nullable(),
    assigneeEmployeeId: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
  })
  .refine(
    (data) => data.assigneeUserId || data.assigneeEmployeeId,
    { message: "يجب تحديد مستخدم أو موظف" },
  );

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.ASSIGNMENTS_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const task = await prisma.projectTask.findUnique({
    where: { id },
    select: { id: true, companyId: true },
  });
  if (!task) return notFoundError("المهمة غير موجودة");

  if (!(await canAccessCompany(user, task.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const assignments = await prisma.taskAssignment.findMany({
    where: { taskId: id },
    include: {
      assigneeUser: { select: { id: true, name: true, email: true } },
      assigneeEmployee: { select: { id: true, name: true, code: true } },
      assignedBy: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: "desc" },
  });

  return successResponse(assignments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.ASSIGNMENTS_CREATE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية إضافة تعيين");
  }

  const { id: taskId } = await params;
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, companyId: true },
  });
  if (!task) return notFoundError("المهمة غير موجودة");

  if (!(await canAccessCompany(currentUser, task.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = createAssignmentSchema.parse(body);

    const existing = await prisma.taskAssignment.findFirst({
      where: {
        taskId,
        assigneeUserId: parsed.assigneeUserId || null,
        assigneeEmployeeId: parsed.assigneeEmployeeId || null,
        status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED] },
      },
    });
    if (existing) {
      return errorResponse("يوجد تعيين نشط لنفس المستخدم/الموظف في هذه المهمة", 409);
    }

    const assignment = await prisma.taskAssignment.create({
      data: {
        companyId: task.companyId,
        taskId,
        assigneeUserId: parsed.assigneeUserId || null,
        assigneeEmployeeId: parsed.assigneeEmployeeId || null,
        assignedById: currentUser.userId,
        role: parsed.role || null,
      },
    });

    await logAudit(
      currentUser.userId,
      "CREATE",
      "TaskAssignment",
      assignment.id,
      {
        taskId,
        assigneeUserId: parsed.assigneeUserId,
        assigneeEmployeeId: parsed.assigneeEmployeeId,
      },
    );

    return successResponse(assignment, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create assignment error:", error);
    return errorResponse("فشل إنشاء التعيين", 500);
  }
}
