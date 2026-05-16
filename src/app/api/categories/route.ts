import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  conflictError,
} from "@/lib/api-response";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" },
  });

  return successResponse(categories);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  try {
    const body = await request.json();
    const parsed = categorySchema.parse(body);

    const existing = await prisma.productCategory.findUnique({
      where: { name: parsed.name },
    });
    if (existing) {
      return conflictError("التصنيف موجود مسبقاً");
    }

    const category = await prisma.productCategory.create({
      data: parsed,
    });

    try {
      await logAudit(user.userId, "CREATE", "ProductCategory", category.id, {
        name: category.name,
      });
    } catch {
      console.error("Audit log failed for category create");
    }

    return successResponse(category, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل إنشاء التصنيف", 500);
  }
}
