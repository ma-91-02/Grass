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
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";
import { ProjectStatus, ProjectPriority } from "@/generated/prisma/client";

const createProjectSchema = z.object({
  code: z.string().min(1, "كود المشروع مطلوب"),
  name: z.string().min(1, "اسم المشروع مطلوب"),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  managerUserId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.PROJECTS_VIEW)))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });
  if (!dbUser?.companyId) return forbiddenError("لا توجد شركة مرتبطة بالمستخدم");

  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const q = searchParams.get("q");

  const whereClause: Record<string, unknown> = {
    companyId: dbUser.companyId,
  };

  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
    ];
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      managerUser: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = projects.map((p) => ({
    id: p.id,
    companyId: p.companyId,
    code: p.code,
    name: p.name,
    description: p.description,
    status: p.status,
    priority: p.priority,
    startDate: p.startDate,
    dueDate: p.dueDate,
    completedAt: p.completedAt,
    managerUserId: p.managerUserId,
    managerUserName: p.managerUser?.name || null,
    taskCount: p._count.tasks,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.PROJECTS_CREATE))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء مشروع");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    select: { companyId: true },
  });
  if (!dbUser?.companyId) return forbiddenError("لا توجد شركة مرتبطة بالمستخدم");

  try {
    const body = await request.json();
    const parsed = createProjectSchema.parse(body);

    const existing = await prisma.project.findUnique({
      where: { companyId_code: { companyId: dbUser.companyId, code: parsed.code } },
    });
    if (existing) return conflictError("كود المشروع مستخدم مسبقاً في هذه الشركة");

    const project = await prisma.project.create({
      data: {
        companyId: dbUser.companyId,
        code: parsed.code,
        name: parsed.name,
        description: parsed.description || null,
        status: parsed.status || ProjectStatus.PLANNED,
        priority: parsed.priority || ProjectPriority.MEDIUM,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        managerUserId: parsed.managerUserId || null,
        createdById: currentUser.userId,
      },
    });

    await logAudit(currentUser.userId, "CREATE", "Project", project.id, {
      code: project.code,
      name: project.name,
      companyId: project.companyId,
    });

    return successResponse(project, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create project error:", error);
    return errorResponse("فشل إنشاء المشروع", 500);
  }
}
