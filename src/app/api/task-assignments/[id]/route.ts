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
  unauthorizedError,
  notFoundError,
  forbiddenError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.ASSIGNMENTS_DELETE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية حذف تعيين");
  }

  const { id } = await params;
  const assignment = await prisma.taskAssignment.findUnique({
    where: { id },
    include: { task: { select: { companyId: true } } },
  });
  if (!assignment) return notFoundError();

  if (!(await canAccessCompany(currentUser, assignment.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  await prisma.taskAssignment.delete({ where: { id } });

  await logAudit(currentUser.userId, "DELETE", "TaskAssignment", id, {
    taskId: assignment.taskId,
    assigneeUserId: assignment.assigneeUserId,
    assigneeEmployeeId: assignment.assigneeEmployeeId,
  });

  return successResponse({ id, action: "deleted" });
}
