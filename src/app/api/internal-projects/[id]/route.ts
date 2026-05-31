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
import { ProjectStatus, ProjectPriority } from "@/generated/prisma/client";

const updateProjectSchema = z.object({
  code: z.string().min(1, "كود المشروع مطلوب").optional(),
  name: z.string().min(1, "اسم المشروع مطلوب").optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  managerUserId: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.PROJECTS_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      managerUser: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) return notFoundError();

  if (!(await canAccessCompany(user, project.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse({
    id: project.id,
    companyId: project.companyId,
    code: project.code,
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    startDate: project.startDate,
    dueDate: project.dueDate,
    completedAt: project.completedAt,
    managerUserId: project.managerUserId,
    managerUserName: project.managerUser?.name || null,
    taskCount: project._count.tasks,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.PROJECTS_EDIT))
  ) {
    return forbiddenError("لا تملك صلاحية تعديل مشروع");
  }

  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (!(await canAccessCompany(currentUser, existing.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = updateProjectSchema.parse(body);

    if (parsed.code && parsed.code !== existing.code) {
      const duplicate = await prisma.project.findUnique({
        where: { companyId_code: { companyId: existing.companyId, code: parsed.code } },
      });
      if (duplicate) {
        return errorResponse("كود المشروع مستخدم مسبقاً في هذه الشركة", 409);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.code !== undefined) updateData.code = parsed.code;
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.status !== undefined) updateData.status = parsed.status;
    if (parsed.priority !== undefined) updateData.priority = parsed.priority;
    if (parsed.startDate !== undefined) updateData.startDate = parsed.startDate ? new Date(parsed.startDate) : null;
    if (parsed.dueDate !== undefined) updateData.dueDate = parsed.dueDate ? new Date(parsed.dueDate) : null;
    if (parsed.managerUserId !== undefined) updateData.managerUserId = parsed.managerUserId;
    updateData.updatedById = currentUser.userId;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    await logAudit(currentUser.userId, "UPDATE", "Project", id, {
      code: project.code,
      name: project.name,
    });

    return successResponse(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث المشروع", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.PROJECTS_DELETE))
  ) {
    return forbiddenError("لا تملك صلاحية حذف مشروع");
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return notFoundError();

  if (!(await canAccessCompany(currentUser, project.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  await prisma.project.update({
    where: { id },
    data: { status: ProjectStatus.CANCELLED, updatedById: currentUser.userId },
  });

  await logAudit(currentUser.userId, "CANCEL", "Project", id, {
    code: project.code,
    name: project.name,
  });

  return successResponse({ id, status: "CANCELLED" });
}
