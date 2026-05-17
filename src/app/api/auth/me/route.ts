import { NextResponse } from "next/server";
import { validateSessionWithDb } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorizedError } from "@/lib/api-response";

export async function GET() {
  const session = await validateSessionWithDb();
  if (!session) return unauthorizedError();

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.userId },
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
      userId: session.user.userId,
      email: session.user.email,
      name: session.user.name,
      roles: session.user.roles,
      permissions,
    },
  });
}
