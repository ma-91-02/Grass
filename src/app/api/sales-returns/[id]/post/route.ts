import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { StockBalanceService } from "@/lib/services/stock-balance-service";
import { PeriodGuard } from "@/lib/services/period-guard";
import { LedgerValidator } from "@/lib/services/ledger-validator";

const ACCOUNT_CODES = {
  AR_IQD: "1.1.6",
  AR_USD: "1.1.7",
  INVENTORY: "1.1.5",
  SALES_REVENUE: "4.1",
  COGS: "5.1",
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.SALES_RETURNS_POST,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية ترحيل مرتجع بيع");
  }

  const { id } = await params;

  // Load return with all related data
  const salesReturn = await prisma.salesReturn.findUnique({
    where: { id },
    include: {
      lines: true,
      originalInvoice: { include: { items: true } },
      customer: true,
      warehouse: true,
    },
  });

  if (!salesReturn) return notFoundError();

  if (
    salesReturn.companyId &&
    !(await canAccessCompany(currentUser, salesReturn.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  // State guard
  if (salesReturn.status !== "DRAFT") {
    return errorResponse(
      salesReturn.status === "POSTED"
        ? "المرتجع تم ترحيله مسبقاً"
        : "المرتجع ليس في حالة مسودة",
      403,
    );
  }

  // Pre-validations
  if (!salesReturn.lines || salesReturn.lines.length === 0) {
    return errorResponse("المرتجع لا يحتوي على بنود", 400);
  }

  if (!salesReturn.warehouseId) {
    return errorResponse("المرتجع لا يحتوي على مخزن", 400);
  }

  if (salesReturn.warehouse && !salesReturn.warehouse.isActive) {
    return errorResponse("المخزن غير نشط", 400);
  }

  if (salesReturn.customer && !salesReturn.customer.isActive) {
    return errorResponse("العميل غير نشط", 400);
  }

  // Check fiscal period
  const periodCheck = await PeriodGuard.checkPeriodOpen(
    salesReturn.companyId,
    salesReturn.returnDate,
    salesReturn.warehouse?.branchId || undefined,
  );
  if (!periodCheck.allowed) {
    return errorResponse(periodCheck.error!, 423);
  }

  // Load system accounts
  const currency = salesReturn.currency;
  const arCode =
    currency === "USD" ? ACCOUNT_CODES.AR_USD : ACCOUNT_CODES.AR_IQD;

  const [arAccount, inventoryAccount, revenueAccount, cogsAccount] =
    await Promise.all([
      prisma.account.findFirst({
        where: { companyId: salesReturn.companyId, code: arCode },
      }),
      prisma.account.findFirst({
        where: {
          companyId: salesReturn.companyId,
          code: ACCOUNT_CODES.INVENTORY,
        },
      }),
      prisma.account.findFirst({
        where: {
          companyId: salesReturn.companyId,
          code: ACCOUNT_CODES.SALES_REVENUE,
        },
      }),
      prisma.account.findFirst({
        where: { companyId: salesReturn.companyId, code: ACCOUNT_CODES.COGS },
      }),
    ]);

  if (!arAccount)
    return errorResponse("حساب الذمم المدينة غير موجود في شجرة الحسابات", 500);
  if (!inventoryAccount)
    return errorResponse("حساب المخزون غير موجود في شجرة الحسابات", 500);
  if (!revenueAccount)
    return errorResponse("حساب إيراد المبيعات غير موجود في شجرة الحسابات", 500);
  if (!cogsAccount)
    return errorResponse(
      "حساب تكلفة البضاعة المباعة غير موجود في شجرة الحسابات",
      500,
    );

  // Validate account statuses
  for (const acc of [
    arAccount,
    inventoryAccount,
    revenueAccount,
    cogsAccount,
  ]) {
    if (!acc.isActive) {
      return errorResponse(`حساب ${acc.name} غير نشط`, 400);
    }
    if (!acc.isPosting) {
      return errorResponse(`حساب ${acc.name} ليس حساب ترحيل`, 400);
    }
  }

  // Guard: customer balance must not go negative (only when balance is positive)
  const customerBalance = Number(salesReturn.customer?.currentBalance ?? 0);
  const returnTotal = Number(salesReturn.totalAmount ?? 0);
  if (customerBalance > 0 && returnTotal > customerBalance) {
    return errorResponse(
      `مبلغ المرتجع (${returnTotal}) يتجاوز رصيد العميل (${customerBalance})`,
      400,
    );
  }

  // Atomic posting transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock return and invoice rows
      await tx.$queryRaw`SELECT id FROM "SalesReturn" WHERE id = ${id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${salesReturn.originalInvoiceId} FOR UPDATE`;

      // Re-read return inside transaction
      const lockedReturn = await tx.salesReturn.findUnique({
        where: { id },
        include: { lines: true, customer: true, originalInvoice: true },
      });
      if (!lockedReturn || lockedReturn.status !== "DRAFT") {
        throw new Error("المرتجع تم تعديله قبل الترحيل");
      }

      // Idempotency guard
      if (lockedReturn.postedAt) {
        throw new Error("المرتجع تم ترحيله مسبقاً");
      }

      const companyId = lockedReturn.companyId;
      const warehouseId = lockedReturn.warehouseId!;
      const returnDate = lockedReturn.returnDate;
      const totalAmount = Number(lockedReturn.totalAmount ?? 0);
      const totalCogs = Number(lockedReturn.totalCogs ?? 0);

      // Re-verify quantities inside transaction
      const previouslyReturned = await tx.salesReturnLine.groupBy({
        by: ["originalInvoiceItemId"],
        where: {
          originalInvoiceItemId: {
            in: lockedReturn.lines.map((l) => l.originalInvoiceItemId),
          },
          salesReturn: {
            originalInvoiceId: lockedReturn.originalInvoiceId,
            status: "POSTED",
          },
        },
        _sum: { quantity: true },
      });

      const returnedQtyMap = new Map(
        previouslyReturned.map((r) => [
          r.originalInvoiceItemId,
          r._sum.quantity ?? 0,
        ]),
      );

      const originalItems = await tx.invoiceItem.findMany({
        where: {
          invoiceId: lockedReturn.originalInvoiceId,
          id: { in: lockedReturn.lines.map((l) => l.originalInvoiceItemId) },
        },
      });
      const itemMap = new Map(originalItems.map((i) => [i.id, i]));

      for (const line of lockedReturn.lines) {
        const invoiceItem = itemMap.get(line.originalInvoiceItemId);
        if (!invoiceItem) throw new Error("بند الفاتورة الأصلية غير موجود");
        const alreadyReturned =
          returnedQtyMap.get(line.originalInvoiceItemId) ?? 0;
        const maxReturn = invoiceItem.quantity - alreadyReturned;
        if (line.quantity > maxReturn) {
          throw new Error(
            `الكمية المرتجعة (${line.quantity}) تتجاوز المتبقي (${maxReturn})`,
          );
        }
      }

      // --- Inventory: create RETURN_IN movements and increase stock ---
      const lineMovementMap: { lineId: string; movementId: string }[] = [];
      for (const line of lockedReturn.lines) {
        const movement = await tx.stockMovement.create({
          data: {
            companyId,
            productId: line.productId,
            warehouseId,
            movementType: "RETURN_IN",
            quantity: line.quantity,
            unitCost: Number(line.averageCostSnapshot ?? 0),
            currency: lockedReturn.currency,
            movementDate: returnDate,
            referenceType: "SalesReturn",
            referenceId: id,
            reason: "Sale Return",
            status: "POSTED",
            createdById: currentUser.userId,
          },
        });

        const applyResult = await StockBalanceService.applyPostedMovement(
          tx,
          movement.id,
        );
        if (!applyResult.success) {
          throw new Error(applyResult.error || "فشل إدخال المخزون");
        }

        await tx.salesReturnLine.update({
          where: { id: line.id },
          data: { stockMovementId: movement.id },
        });

        lineMovementMap.push({ lineId: line.id, movementId: movement.id });
      }

      // --- Generate journal entry numbers ---
      const jeCount = await tx.journalEntry.count({ where: { companyId } });
      const revenueEntryNumber = `JE-${String(jeCount + 1).padStart(5, "0")}`;
      const cogsEntryNumber = `JE-${String(jeCount + 2).padStart(5, "0")}`;

      // --- Revenue Reversal Journal Entry ---
      const revenueLines = [
        {
          accountId: revenueAccount.id,
          debit: totalAmount,
          credit: 0,
          description: `عكس إيراد - مرتجع ${lockedReturn.returnNumber}`,
        },
        {
          accountId: arAccount.id,
          debit: 0,
          credit: totalAmount,
          description: `تخفيض ذمة - مرتجع ${lockedReturn.returnNumber}`,
        },
      ];

      const revenueValidation = LedgerValidator.validateLines(revenueLines);
      if (!revenueValidation.valid) {
        throw new Error(
          `قيد عكس الإيراد غير متوازن: ${revenueValidation.errors.join(" | ")}`,
        );
      }

      const revenueJournal = await tx.journalEntry.create({
        data: {
          companyId,
          entryNumber: revenueEntryNumber,
          entryDate: returnDate,
          currency: lockedReturn.currency,
          exchangeRateSnapshot: 1,
          description: `عكس إيراد مبيعات - مرتجع ${lockedReturn.returnNumber}`,
          sourceType: "SalesReturn",
          sourceId: id,
          status: "POSTED",
          postedAt: new Date(),
          createdById: currentUser.userId,
          lines: {
            create: revenueLines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
        include: { lines: true },
      });

      // --- COGS Reversal Journal Entry ---
      let cogsJournal = null;
      if (totalCogs > 0) {
        const cogsLines = [
          {
            accountId: inventoryAccount.id,
            debit: totalCogs,
            credit: 0,
            description: `إدخال مخزون - مرتجع ${lockedReturn.returnNumber}`,
          },
          {
            accountId: cogsAccount.id,
            debit: 0,
            credit: totalCogs,
            description: `عكس COGS - مرتجع ${lockedReturn.returnNumber}`,
          },
        ];

        const cogsValidation = LedgerValidator.validateLines(cogsLines);
        if (!cogsValidation.valid) {
          throw new Error(
            `قيد عكس COGS غير متوازن: ${cogsValidation.errors.join(" | ")}`,
          );
        }

        cogsJournal = await tx.journalEntry.create({
          data: {
            companyId,
            entryNumber: cogsEntryNumber,
            entryDate: returnDate,
            currency: lockedReturn.currency,
            exchangeRateSnapshot: 1,
            description: `عكس تكلفة بضاعة مباعة - مرتجع ${lockedReturn.returnNumber}`,
            sourceType: "SalesReturn",
            sourceId: id,
            status: "POSTED",
            postedAt: new Date(),
            createdById: currentUser.userId,
            lines: {
              create: cogsLines.map((l) => ({
                accountId: l.accountId,
                debit: l.debit,
                credit: l.credit,
                description: l.description,
              })),
            },
          },
          include: { lines: true },
        });
      }

      // --- Update customer balance (decrement) ---
      if (lockedReturn.customerId && totalAmount > 0) {
        await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${lockedReturn.customerId} FOR UPDATE`;
        const lockedCustomer = await tx.customer.findUnique({
          where: { id: lockedReturn.customerId },
        });
        if (lockedCustomer) {
          const balance = Number(lockedCustomer.currentBalance ?? 0);
          if (balance > 0 && totalAmount > balance) {
            throw new Error(
              `مبلغ المرتجع (${totalAmount}) يتجاوز رصيد العميل (${balance})`,
            );
          }
          await tx.customer.update({
            where: { id: lockedReturn.customerId },
            data: { currentBalance: { decrement: totalAmount } },
          });
        }
      }

      // --- Update return to POSTED ---
      const postedReturn = await tx.salesReturn.update({
        where: { id },
        data: {
          status: "POSTED",
          postedAt: new Date(),
          postedById: currentUser.userId,
          journalEntryId: revenueJournal.id,
          cogsJournalEntryId: cogsJournal?.id || null,
        },
        include: { lines: true },
      });

      // --- Update original invoice status if fully returned ---
      const originalInvoice = lockedReturn.originalInvoice;
      if (originalInvoice) {
        const allItems = await tx.invoiceItem.findMany({
          where: { invoiceId: originalInvoice.id },
        });
        const allReturned = await tx.salesReturnLine.groupBy({
          by: ["originalInvoiceItemId"],
          where: {
            salesReturn: {
              originalInvoiceId: originalInvoice.id,
              status: "POSTED",
            },
            originalInvoiceItemId: { in: allItems.map((i) => i.id) },
          },
          _sum: { quantity: true },
        });
        const returnedMap = new Map(
          allReturned.map((r) => [
            r.originalInvoiceItemId,
            r._sum.quantity ?? 0,
          ]),
        );

        const fullyReturned = allItems.every((item) => {
          const returned = returnedMap.get(item.id) ?? 0;
          return returned >= item.quantity;
        });

        if (fullyReturned) {
          await tx.invoice.update({
            where: { id: originalInvoice.id },
            data: { status: "RETURNED_FULL" },
          });
        } else {
          // Check if any partial return exists
          const anyReturned = allReturned.length > 0;
          if (anyReturned) {
            await tx.invoice.update({
              where: { id: originalInvoice.id },
              data: { status: "RETURNED_PARTIAL" },
            });
          }
        }
      }

      // --- Audit inside transaction ---
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: "POST",
          entity: "SalesReturn",
          entityId: id,
          details: {
            returnNumber: lockedReturn.returnNumber,
            companyId,
            totalAmount,
            totalCogs,
            revenueJournalId: revenueJournal.id,
            cogsJournalId: cogsJournal?.id,
            stockMovements: lineMovementMap.map((m) => m.movementId),
          } as never,
        },
      });

      return {
        salesReturn: postedReturn,
        revenueJournal,
        cogsJournal,
        lineMovementMap,
      };
    });

    return successResponse({
      id: result.salesReturn.id,
      returnNumber: salesReturn.returnNumber,
      status: result.salesReturn.status,
      postedAt: result.salesReturn.postedAt,
      totalAmount: Number(salesReturn.totalAmount ?? 0),
      totalCogs: result.salesReturn.totalCogs
        ? Number(result.salesReturn.totalCogs)
        : 0,
      revenueJournalId: result.revenueJournal.id,
      cogsJournalId: result.cogsJournal?.id,
      stockMovementIds: result.lineMovementMap.map((m) => m.movementId),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "فشل ترحيل المرتجع";
    console.error("Sales return posting error:", error);
    return errorResponse(message, 500);
  }
}
