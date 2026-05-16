import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const packagings = await prisma.productPackaging.findMany({
    orderBy: { name: "asc" },
  });

  return successResponse(packagings);
}
