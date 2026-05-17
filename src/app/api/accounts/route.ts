import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  serverError,
} from "@/lib/api-response";
import { accountFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.ACCOUNTS_VIEW))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const parentId = searchParams.get("parentId");

  if (!companyId) return errorResponse("companyId مطلوب");

  const where: Record<string, unknown> = { companyId };
  if (parentId === "null") where.parentId = null;
  else if (parentId) where.parentId = parentId;

  const accounts = await prisma.account.findMany({
    where,
    orderBy: { code: "asc" },
    include: {
      _count: { select: { children: true } },
    },
  });

  const data = accounts.map((a) => ({
    ...a,
    childrenCount: a._count.children,
    _count: undefined,
  }));

  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.ACCOUNTS_CREATE))
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = accountFormSchema.parse(body);

    const existing = await prisma.account.findUnique({
      where: {
        companyId_code: { companyId: parsed.companyId, code: parsed.code },
      },
    });
    if (existing) return errorResponse("رقم الحساب موجود مسبقاً", 409);

    let level = 0;
    if (parsed.parentId) {
      const parent = await prisma.account.findUnique({
        where: { id: parsed.parentId },
      });
      if (!parent) return errorResponse("الحساب الأب غير موجود");
      if (parent.companyId !== parsed.companyId)
        return errorResponse("الحساب الأب لا ينتمي لنفس الشركة");
      if (parent.isPosting)
        return errorResponse("لا يمكن إنشاء حساب تابع تحت حساب مرحّل");
      if (parent.currency !== parsed.currency)
        return errorResponse("عملة الحساب لا تطابق عملة الحساب الأب");
      level = parent.level + 1;
    }

    const account = await prisma.account.create({
      data: {
        ...parsed,
        level,
        createdById: user.userId,
      },
    });

    await logAudit(user.userId, "CREATE", "Account", account.id, {
      code: account.code,
      name: account.name,
      type: account.type,
      level: account.level,
    });

    return successResponse(account, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return serverError(error);
  }
}
