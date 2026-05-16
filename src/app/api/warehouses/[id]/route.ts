import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  conflictError,
  serverError,
} from "@/lib/api-response";
import { z } from "zod";

const warehouseSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").optional(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const { id } = await params;
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
  });

  if (!warehouse) return notFoundError();

  const invoiceCount = await prisma.invoice.count({
    where: { warehouseId: id },
  });

  return successResponse({ ...warehouse, inUse: invoiceCount > 0 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  const { id } = await params;
  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  try {
    const body = await request.json();
    const parsed = warehouseSchema.parse(body);

    if (parsed.isActive === false) {
      const invoiceCount = await prisma.invoice.count({
        where: { warehouseId: id },
      });
      if (invoiceCount > 0) {
        return conflictError(
          "لا يمكن تعطيل أو حذف هذا المخزن لأنه يحتوي على مواد أو حركات مخزنية",
        );
      }
    }

    if (parsed.name) {
      const duplicate = await prisma.warehouse.findUnique({
        where: { name: parsed.name },
      });
      if (duplicate && duplicate.id !== id) {
        return errorResponse("مخزن آخر بنفس الاسم موجود مسبقاً", 409);
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: parsed,
    });

    await logAudit(currentUser.userId, "UPDATE", "Warehouse", id, {
      name: warehouse.name,
    });

    return successResponse(warehouse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث المخزن", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  const { id } = await params;
  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  try {
    const invoiceCount = await prisma.invoice.count({
      where: { warehouseId: id },
    });
    if (invoiceCount > 0) {
      return conflictError(
        "لا يمكن حذف هذا المخزن نهائياً لأنه يحتوي على عمليات أو بيانات مرتبطة",
      );
    }

    await prisma.warehouse.delete({ where: { id } });

    await logAudit(currentUser.userId, "DELETE", "Warehouse", id, {
      name: existing.name,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return serverError(error);
  }
}
