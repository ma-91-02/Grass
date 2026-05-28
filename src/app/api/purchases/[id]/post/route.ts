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
import { ACCOUNT_CODES } from "@/lib/account-codes";
import { CurrencyGuard } from "@/lib/services/currency-guard";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.PURCHASES_POST,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية ترحيل فاتورة مشتريات");
  }

  const { id } = await params;

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      supplier: true,
      warehouse: true,
      company: true,
      paymentAccount: true,
    },
  });

  if (!invoice) return notFoundError();

  if (
    invoice.companyId &&
    !(await canAccessCompany(currentUser, invoice.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (invoice.status !== "DRAFT") {
    return errorResponse(
      invoice.status === "POSTED"
        ? "الفاتورة تم ترحيلها مسبقاً"
        : "الفاتورة ليست في حالة مسودة",
      403,
    );
  }

  if (!invoice.items || invoice.items.length === 0) {
    return errorResponse("الفاتورة لا تحتوي على بنود", 400);
  }

  if (!invoice.warehouseId) {
    return errorResponse("الفاتورة لا تحتوي على مخزن", 400);
  }

  if (invoice.warehouse && !invoice.warehouse.isActive) {
    return errorResponse("المخزن غير نشط", 400);
  }

  if (invoice.supplier && !invoice.supplier.isActive) {
    return errorResponse("المورد غير نشط", 400);
  }

  if (invoice.paymentMethod !== "CREDIT" && !invoice.paymentAccountId) {
    return errorResponse("حساب الدفع مطلوب للدفع النقدي", 400);
  }

  const periodCheck = await PeriodGuard.checkPeriodOpen(
    invoice.companyId!,
    invoice.purchaseDate,
    invoice.warehouse?.branchId || undefined,
  );
  if (!periodCheck.allowed) {
    return errorResponse(periodCheck.error!, 423);
  }

  const currency = invoice.currency;
  const apCode = currency === "USD" ? ACCOUNT_CODES.AP_USD : ACCOUNT_CODES.AP_IQD;
  const cashCode = currency === "USD" ? ACCOUNT_CODES.CASH_USD : ACCOUNT_CODES.CASH_IQD;
  const inventoryCode = ACCOUNT_CODES.INVENTORY;

  const [apAccount, cashAccount, inventoryAccount] = await Promise.all([
    prisma.account.findFirst({
      where: { companyId: invoice.companyId!, code: apCode },
    }),
    prisma.account.findFirst({
      where: { companyId: invoice.companyId!, code: cashCode },
    }),
    prisma.account.findFirst({
      where: { companyId: invoice.companyId!, code: inventoryCode },
    }),
  ]);

  if (!inventoryAccount) {
    return errorResponse("حساب المخزون غير موجود في شجرة الحسابات", 500);
  }
  if (!apAccount) {
    return errorResponse("حساب الذمم الدائنة غير موجود في شجرة الحسابات", 500);
  }
  if (invoice.paymentMethod !== "CREDIT" && !cashAccount) {
    return errorResponse("حساب الصندوق غير موجود في شجرة الحسابات", 500);
  }

  const accountCurrencies = new Map<string, string>();
  accountCurrencies.set(inventoryAccount.id, inventoryAccount.currency);
  accountCurrencies.set(apAccount.id, apAccount.currency);
  if (cashAccount) accountCurrencies.set(cashAccount.id, cashAccount.currency);

  const currencyCheck = CurrencyGuard.validateJournalCurrency(
    currency,
    [
      { accountId: inventoryAccount.id, debit: 1, credit: 0 },
      { accountId: apAccount.id, debit: 0, credit: 1 },
      ...(cashAccount ? [{ accountId: cashAccount.id, debit: 0, credit: 1 }] : []),
    ],
    accountCurrencies,
  );
  if (!currencyCheck.allowed) {
    return errorResponse(`تضارب في عملة الحسابات: ${currencyCheck.errors.join(" | ")}`, 500);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseInvoice" WHERE id = ${id} FOR UPDATE`;

      const lockedInvoice = await tx.purchaseInvoice.findUnique({
        where: { id },
        include: { items: true, warehouse: true },
      });

      if (!lockedInvoice || lockedInvoice.status !== "DRAFT") {
        throw new Error("الفاتورة تم تعديلها قبل الترحيل");
      }

      if (lockedInvoice.journalEntryId) {
        throw new Error("الفاتورة تم ترحيلها مسبقاً");
      }

      const companyId = lockedInvoice.companyId!;
      const totalCost = Number(lockedInvoice.totalCost ?? 0);
      const paid = Number(lockedInvoice.paid ?? 0);
      const remaining = Number(lockedInvoice.remaining ?? 0);

      if (totalCost <= 0) {
        throw new Error("تكلفة الفاتورة يجب أن تكون أكبر من 0");
      }

      let totalStockCost = 0;

      for (const item of lockedInvoice.items) {
        if (!item.productId) continue;
        const unitCost = Number(item.unitFinalCost ?? 0);

        const movement = await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            warehouseId: lockedInvoice.warehouseId!,
            movementType: "IN",
            quantity: item.quantity,
            unitCost,
            currency: lockedInvoice.currency,
            movementDate: lockedInvoice.purchaseDate,
            referenceType: "PurchaseInvoice",
            referenceId: id,
            reason: "Purchase",
            status: "DRAFT",
            createdById: currentUser.userId,
          },
        });

        const applyResult = await StockBalanceService.applyPostedMovement(
          tx,
          movement.id,
        );
        if (!applyResult.success) {
          throw new Error(applyResult.error || "فشل تحديث رصيد المخزون");
        }

        totalStockCost += unitCost * item.quantity;
      }

      const jeCount = await tx.journalEntry.count({ where: { companyId } });
      const entryNumber = `JE-${String(jeCount + 1).padStart(5, "0")}`;

      const lines: {
        accountId: string;
        debit: number;
        credit: number;
        description: string;
      }[] = [];

      lines.push({
        accountId: inventoryAccount.id,
        debit: totalCost,
        credit: 0,
        description: `مخزون - فاتورة ${lockedInvoice.invoiceNumber}`,
      });

      if (invoice.paymentMethod === "CREDIT" || (invoice.paymentMethod !== "CREDIT" && remaining > 0)) {
        lines.push({
          accountId: apAccount.id,
          debit: 0,
          credit: remaining > 0 ? remaining : totalCost,
          description: `ذمم دائنة - فاتورة ${lockedInvoice.invoiceNumber}`,
        });
      }

      if (invoice.paymentMethod !== "CREDIT" && paid > 0 && cashAccount) {
        lines.push({
          accountId: cashAccount.id,
          debit: 0,
          credit: paid,
          description: `نقدي - فاتورة ${lockedInvoice.invoiceNumber}`,
        });
      }

      const validation = LedgerValidator.validateLines(lines);
      if (!validation.valid) {
        throw new Error(
          `قيد المشتريات غير متوازن: ${validation.errors.join(" | ")}`,
        );
      }

      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId,
          branchId: lockedInvoice.warehouse?.branchId || null,
          entryNumber,
          entryDate: lockedInvoice.purchaseDate,
          currency: lockedInvoice.currency,
          exchangeRateSnapshot: Number(
            lockedInvoice.exchangeRateValue ?? 1,
          ),
          description: `مشتريات - فاتورة ${lockedInvoice.invoiceNumber}`,
          sourceType: "PurchaseInvoice",
          sourceId: id,
          status: "POSTED",
          postedAt: new Date(),
          createdById: currentUser.userId,
          lines: {
            create: lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
        include: { lines: true },
      });

      const postedInvoice = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          status: "POSTED",
          postedAt: new Date(),
          postedById: currentUser.userId,
          journalEntryId: journalEntry.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: "POST",
          entity: "PurchaseInvoice",
          entityId: id,
          details: {
            invoiceNumber: lockedInvoice.invoiceNumber,
            companyId,
            totalCost,
            journalEntryId: journalEntry.id,
          } as never,
        },
      });

      return { invoice: postedInvoice, journalEntry };
    });

    return successResponse({
      id: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      status: result.invoice.status,
      postedAt: result.invoice.postedAt,
      journalEntryId: result.journalEntry.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "فشل ترحيل فاتورة المشتريات";
    console.error("Purchase invoice posting error:", error);
    return errorResponse(message, 500);
  }
}
