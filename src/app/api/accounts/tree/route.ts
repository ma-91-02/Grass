import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

interface TreeNode {
  id: string;
  code: string;
  name: string;
  type: string;
  level: number;
  currency: string;
  children: TreeNode[];
}

function buildTree(
  accounts: Array<Record<string, unknown>>,
  parentId: string | null = null,
): TreeNode[] {
  return accounts
    .filter((a) => a.parentId === parentId)
    .map((a) => ({
      id: a.id as string,
      code: a.code as string,
      name: a.name as string,
      type: a.type as string,
      level: a.level as number,
      currency: a.currency as string,
      children: buildTree(accounts, a.id as string),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.ACCOUNTS_TREE))
    return unauthorizedError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) return errorResponse("companyId مطلوب");

  const accounts = await prisma.account.findMany({
    where: { companyId, isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      level: true,
      currency: true,
      parentId: true,
    },
    orderBy: { code: "asc" },
  });

  const tree = buildTree(accounts as unknown as Array<Record<string, unknown>>);

  return successResponse(tree);
}
