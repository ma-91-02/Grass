import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireDbPermission } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  forbiddenError,
  serverError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();
    if (!(await requireDbPermission(user.userId, PERMISSIONS.ROLES_VIEW)))
      return forbiddenError();

    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { name: "asc" }],
    });

    return successResponse(permissions);
  } catch (error) {
    return serverError(error);
  }
}
