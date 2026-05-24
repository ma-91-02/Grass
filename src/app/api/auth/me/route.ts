import { validateSessionWithDb, isSystemOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, unauthorizedError } from "@/lib/api-response";

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

  const isOwner = await isSystemOwner(session.user);
  const displayRole = isOwner ? "مالك النظام" : (session.user.roles?.[0] || "مستخدم");

  return successResponse({
    userId: session.user.userId,
    email: session.user.email,
    name: session.user.name,
    roles: session.user.roles,
    permissions,
    companyId: dbUser.companyId,
    displayRole,
  });
}
