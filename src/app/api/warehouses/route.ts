import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { z } from "zod";

const warehouseSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  address: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: "asc" },
  });

  const invoiceCounts = await prisma.invoice.groupBy({
    by: ["warehouseId"],
    _count: { id: true },
  });
  const inUseMap = new Map(
    invoiceCounts.map((ic) => [ic.warehouseId, ic._count.id > 0]),
  );

  const data = warehouses.map((w) => ({
    ...w,
    inUse: inUseMap.get(w.id) || false,
  }));

  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  try {
    const body = await request.json();
    const parsed = warehouseSchema.parse(body);

    const existingName = await prisma.warehouse.findUnique({
      where: { name: parsed.name },
    });
    if (existingName) {
      return errorResponse("يوجد مخزن بهذا الاسم مسبقاً", 409);
    }

    const allCodes = await prisma.warehouse.findMany({
      where: { code: { startsWith: "WH-" } },
      select: { code: true },
    });
    let maxNum = 0;
    for (const { code } of allCodes) {
      const num = parseInt(code.replace("WH-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    const code = `WH-${String(maxNum + 1).padStart(4, "0")}`;

    let warehouse;
    try {
      warehouse = await prisma.warehouse.create({
        data: { ...parsed, code },
      });
    } catch (createError: unknown) {
      if (
        createError &&
        typeof createError === "object" &&
        "code" in createError &&
        (createError as Record<string, unknown>).code === "P2002"
      ) {
        const fallbackCodes = await prisma.warehouse.findMany({
          where: { code: { startsWith: "WH-" } },
          select: { code: true },
        });
        let fbMax = 0;
        for (const { code } of fallbackCodes) {
          const num = parseInt(code.replace("WH-", ""), 10);
          if (!isNaN(num) && num > fbMax) fbMax = num;
        }
        warehouse = await prisma.warehouse.create({
          data: { ...parsed, code: `WH-${String(fbMax + 1).padStart(4, "0")}` },
        });
      } else {
        throw createError;
      }
    }

    await logAudit(user.userId, "CREATE", "Warehouse", warehouse.id, {
      name: warehouse.name,
    });

    return successResponse(warehouse, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل إنشاء المخزن", 500);
  }
}
