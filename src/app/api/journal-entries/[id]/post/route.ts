import { NextRequest } from "next/server";
import { getCurrentUser, checkPermission } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  serverError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PostingService } from "@/lib/services/posting-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.JOURNALS_POST))
    return unauthorizedError();

  const { id } = await params;

  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return notFoundError();

  const idempotencyKey = `JE_POST_${id}_${user.userId}_${Date.now()}`;

  const result = await PostingService.postJournal({
    journalEntryId: id,
    userId: user.userId,
    idempotencyKey,
  });

  if (!result.success) {
    return serverError(new Error(result.error || "فشل الترحيل"));
  }

  return successResponse({
    success: true,
    journalEntryId: result.journalEntryId,
  });
}
