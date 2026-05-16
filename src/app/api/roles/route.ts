import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const data = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissions: r.permissions.map((p) => p.permission.key),
  }));

  return successResponse(data);
}
