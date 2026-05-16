import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorizedError } from "@/lib/api-response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!dbUser || !dbUser.isActive) return unauthorizedError();

  const permissions = dbUser.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.key),
  );

  return NextResponse.json({
    success: true,
    data: {
      ...user,
      permissions,
    },
  });
}
