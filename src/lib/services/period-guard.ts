import { prisma } from "@/lib/prisma";

export class PeriodGuard {
  static async checkPeriodOpen(
    companyId: string,
    entryDate: Date,
    branchId?: string,
  ): Promise<{ allowed: boolean; error?: string }> {
    const period = await prisma.fiscalPeriod.findFirst({
      where: {
        companyId,
        branchId: branchId || null,
        startDate: { lte: entryDate },
        endDate: { gte: entryDate },
      },
    });

    if (!period) {
      return {
        allowed: false,
        error: "لا توجد فترة مالية مفتوحة لهذا التاريخ",
      };
    }

    if (period.status === "HARD_CLOSED") {
      return {
        allowed: false,
        error: `الفترة المالية "${period.name}" مغلقة بشكل نهائي`,
      };
    }

    if (period.status === "CLOSING_IN_PROGRESS") {
      return {
        allowed: false,
        error: `الفترة المالية "${period.name}" قيد الإغلاق`,
      };
    }

    if (period.status === "FUTURE") {
      return {
        allowed: false,
        error: `الفترة المالية "${period.name}" لم تبدأ بعد`,
      };
    }

    if (period.status === "SOFT_CLOSED") {
      // In soft-close, only approved adjustments are allowed
      return {
        allowed: false,
        error: `الفترة المالية "${period.name}" مغلقة (يسمح فقط بالتعديلات المعتمدة)`,
      };
    }

    return { allowed: true };
  }

  static async getOpenPeriod(companyId: string, date: Date, branchId?: string) {
    return prisma.fiscalPeriod.findFirst({
      where: {
        companyId,
        branchId: branchId || null,
        status: "OPEN",
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
  }
}
