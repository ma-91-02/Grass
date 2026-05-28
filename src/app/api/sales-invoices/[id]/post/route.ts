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
import { CurrencyGuard } from "@/lib/services/currency-guard";

/**
 * Sales Invoice Posting Engine
 * Converts a DRAFT sales invoice into POSTED state with:
 * - Stock OUT movements + balance deduction
 * - COGS calculation using weighted average cost
 * - Revenue journal entry
 * - COGS journal entry
 * - Customer balance update (for credit/mixed)
 * All inside a single atomic transaction.
 */

// System account codes (fixed per company chart of accounts)
const ACCOUNT_CODES = {
  CASH_IQD: "1.1.1",
  CASH_USD: "1.1.2",
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
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.SALES_POST))
  ) {
    return forbiddenError("لا تملك صلاحية ترحيل فاتورة بيع");
  }

  const { id } = await params;

  // Load invoice with all related data
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      customer: true,
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

  // 1. State guard
  if (invoice.status !== "DRAFT") {
    return errorResponse(
      invoice.status === "POSTED"
        ? "الفاتورة تم ترحيلها مسبقاً"
        : "الفاتورة ليست في حالة مسودة",
      403,
    );
  }

  // 2. Pre-validations
  if (!invoice.items || invoice.items.length === 0) {
    return errorResponse("الفاتورة لا تحتوي على بنود", 400);
  }

  if (!invoice.warehouseId) {
    return errorResponse("الفاتورة لا تحتوي على مخزن", 400);
  }

  if (invoice.warehouse && !invoice.warehouse.isActive) {
    return errorResponse("المخزن غير نشط", 400);
  }

  for (const item of invoice.items) {
    if (!item.product || !item.product.isActive) {
      return errorResponse(
        `المنتج "${item.product?.name || item.productNameSnapshot || item.productId}" غير نشط`,
        400,
      );
    }
  }

  if (invoice.customerId && invoice.customer && !invoice.customer.isActive) {
    return errorResponse("العميل غير نشط", 400);
  }

  if (invoice.paymentType === "CASH" || invoice.paymentType === "MIXED") {
    if (!invoice.paymentAccountId) {
      return errorResponse("حساب الدفع مطلوب للدفع النقدي أو المختلط", 400);
    }
  }

  // 3. Check fiscal period is open
  const periodCheck = await PeriodGuard.checkPeriodOpen(
    invoice.companyId!,
    invoice.invoiceDate,
    invoice.warehouse?.branchId || undefined,
  );
  if (!periodCheck.allowed) {
    return errorResponse(periodCheck.error!, 423);
  }

  // 4. Pre-check stock availability (outside transaction for fast-fail)
  for (const item of invoice.items) {
    const stockCheck = await StockBalanceService.ensureSufficientStock(
      invoice.companyId!,
      item.productId,
      invoice.warehouseId!,
      item.quantity,
    );
    if (!stockCheck.sufficient) {
      return errorResponse(
        `رصيد المخزون لا يكفي للمنتج "${item.product?.name || item.productNameSnapshot || item.productId}" (مطلوب: ${item.quantity}, متوفر: ${stockCheck.available})`,
        400,
      );
    }
  }

  // 5. Load system accounts
  const currency = invoice.currency;
  const cashCode =
    currency === "USD" ? ACCOUNT_CODES.CASH_USD : ACCOUNT_CODES.CASH_IQD;
  const arCode =
    currency === "USD" ? ACCOUNT_CODES.AR_USD : ACCOUNT_CODES.AR_IQD;

  const [
    cashAccount,
    arAccount,
    inventoryAccount,
    revenueAccount,
    cogsAccount,
  ] = await Promise.all([
    prisma.account.findFirst({
      where: { companyId: invoice.companyId!, code: cashCode },
    }),
    prisma.account.findFirst({
      where: { companyId: invoice.companyId!, code: arCode },
    }),
    prisma.account.findFirst({
      where: { companyId: invoice.companyId!, code: ACCOUNT_CODES.INVENTORY },
    }),
    prisma.account.findFirst({
      where: {
        companyId: invoice.companyId!,
        code: ACCOUNT_CODES.SALES_REVENUE,
      },
    }),
    prisma.account.findFirst({
      where: { companyId: invoice.companyId!, code: ACCOUNT_CODES.COGS },
    }),
  ]);

  if (!cashAccount)
    return errorResponse("حساب الصندوق غير موجود في شجرة الحسابات", 500);
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

  const accountCurrencies = new Map<string, string>();
  accountCurrencies.set(revenueAccount.id, revenueAccount.currency);
  accountCurrencies.set(inventoryAccount.id, inventoryAccount.currency);
  accountCurrencies.set(cogsAccount.id, cogsAccount.currency);
  accountCurrencies.set(cashAccount.id, cashAccount.currency);
  accountCurrencies.set(arAccount.id, arAccount.currency);

  const currencyCheck = CurrencyGuard.validateJournalCurrency(
    invoice.currency,
    [
      { accountId: cashAccount.id, debit: 1, credit: 0 },
      { accountId: arAccount.id, debit: 1, credit: 0 },
      { accountId: revenueAccount.id, debit: 0, credit: 1 },
      { accountId: cogsAccount.id, debit: 1, credit: 0 },
      { accountId: inventoryAccount.id, debit: 0, credit: 1 },
    ],
    accountCurrencies,
  );
  if (!currencyCheck.allowed) {
    return errorResponse(`تضارب في عملة الحسابات: ${currencyCheck.errors.join(" | ")}`, 500);
  }

  // 6. Atomic posting transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock invoice row
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;

      // Re-read invoice inside transaction
      const lockedInvoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true, warehouse: true },
      });
      if (!lockedInvoice || lockedInvoice.status !== "DRAFT") {
        throw new Error("الفاتورة تم تعديلها قبل الترحيل");
      }

      // Idempotency guard: postedAt must be null (blocks duplicate posting even if status somehow skipped)
      if (lockedInvoice.postedAt) {
        throw new Error("الفاتورة تم ترحيلها مسبقاً");
      }

      const companyId = lockedInvoice.companyId!;
      const warehouseId = lockedInvoice.warehouseId!;
      const invoiceDate = lockedInvoice.invoiceDate;
      const totalAfterTax = Number(lockedInvoice.totalAfterTax ?? 0);
      const paid = Number(lockedInvoice.paid ?? 0);
      const remaining = Number(lockedInvoice.remaining ?? 0);
      const subtotal = Number(lockedInvoice.totalBeforeTax ?? 0);
      const totalDiscount = Number(lockedInvoice.discountAmount ?? 0);

      // --- Server-side total consistency guards ---
      if (totalAfterTax < 0) {
        throw new Error("المجموع الإجمالي لا يمكن أن يكون سالباً");
      }
      if (paid < 0 || remaining < 0) {
        throw new Error("المبلغ المدفوع أو المتبقي لا يمكن أن يكون سالباً");
      }
      if (paid > totalAfterTax) {
        throw new Error("المبلغ المدفوع لا يمكن أن يتجاوز المجموع الإجمالي");
      }
      if (Math.abs(remaining - (totalAfterTax - paid)) > 0.001) {
        throw new Error("عدم تناسق في حسابات الفاتورة");
      }

      // --- Discount hardening ---
      if (totalDiscount > subtotal) {
        throw new Error("إجمالي الخصم لا يمكن أن يتجاوز المجموع الفرعي");
      }

      // --- Credit limit re-check inside transaction ---
      if (lockedInvoice.customerId && remaining > 0) {
        await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${lockedInvoice.customerId} FOR UPDATE`;
        const customer = await tx.customer.findUnique({
          where: { id: lockedInvoice.customerId },
        });
        if (customer && Number(customer.creditLimit ?? 0) > 0) {
          const currentBalance = Number(customer.currentBalance ?? 0);
          const projectedBalance = currentBalance + remaining;
          if (projectedBalance > Number(customer.creditLimit)) {
            throw new Error(
              `تجاوز حد الائتمان: الرصيد الحالي ${currentBalance} + ${remaining} = ${projectedBalance}، الحد الأقصى ${customer.creditLimit}`,
            );
          }
        }
      }

      // --- Inventory: create OUT movements and deduct stock ---
      let totalCogs = 0;
      const lineCogsMap: {
        itemId: string;
        cogs: number;
        movementId: string;
      }[] = [];

      for (const item of lockedInvoice.items) {
        // Create stock OUT movement
        const movement = await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            warehouseId,
            movementType: "OUT",
            quantity: item.quantity,
            unitCost: 0, // will be updated after balance read
            currency: lockedInvoice.currency,
            movementDate: invoiceDate,
            referenceType: "SalesInvoice",
            referenceId: id,
            reason: "Sale",
            status: "DRAFT",
            createdById: currentUser.userId,
          },
        });

        // Apply movement to stock balance
        const applyResult = await StockBalanceService.applyPostedMovement(
          tx,
          movement.id,
        );
        if (!applyResult.success) {
          throw new Error(applyResult.error || "فشل خصم المخزون");
        }

        // Get average cost from updated balance.
        // Note: applyPostedMovement for OUT movements does NOT change averageCost
        // (see StockBalanceService: average cost is preserved on decrease).
        // Reading after apply is deterministic and matches the cost used for COGS.
        const balance = await tx.stockBalance.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId: item.productId,
              warehouseId,
            },
          },
        });

        const avgCost = balance ? Number(balance.averageCost) : 0;
        const lineCogs = item.quantity * avgCost;
        totalCogs += lineCogs;

        // Update movement with actual cost
        await tx.stockMovement.update({
          where: { id: movement.id },
          data: { unitCost: avgCost },
        });

        // Update invoice item with cost snapshot and movement reference
        await tx.invoiceItem.update({
          where: { id: item.id },
          data: {
            averageCostSnapshot: avgCost,
            stockMovementId: movement.id,
          },
        });

        lineCogsMap.push({
          itemId: item.id,
          cogs: lineCogs,
          movementId: movement.id,
        });
      }

      // --- Generate journal entry numbers ---
      const jeCount = await tx.journalEntry.count({ where: { companyId } });
      const revenueEntryNumber = `JE-${String(jeCount + 1).padStart(5, "0")}`;
      const cogsEntryNumber = `JE-${String(jeCount + 2).padStart(5, "0")}`;

      // --- Revenue Journal Entry ---
      const revenueLines: {
        accountId: string;
        debit: number;
        credit: number;
        description: string;
      }[] = [];

      if (lockedInvoice.paymentType === "CASH") {
        revenueLines.push({
          accountId: cashAccount.id,
          debit: totalAfterTax,
          credit: 0,
          description: `نقدي - فاتورة ${lockedInvoice.invoiceNumber}`,
        });
      } else if (lockedInvoice.paymentType === "CREDIT") {
        revenueLines.push({
          accountId: arAccount.id,
          debit: totalAfterTax,
          credit: 0,
          description: `آجل - فاتورة ${lockedInvoice.invoiceNumber}`,
        });
      } else if (lockedInvoice.paymentType === "MIXED") {
        if (paid > 0) {
          revenueLines.push({
            accountId: cashAccount.id,
            debit: paid,
            credit: 0,
            description: `نقدي جزئي - فاتورة ${lockedInvoice.invoiceNumber}`,
          });
        }
        if (remaining > 0) {
          revenueLines.push({
            accountId: arAccount.id,
            debit: remaining,
            credit: 0,
            description: `آجل جزئي - فاتورة ${lockedInvoice.invoiceNumber}`,
          });
        }
      }

      revenueLines.push({
        accountId: revenueAccount.id,
        debit: 0,
        credit: totalAfterTax,
        description: `إيراد مبيعات - فاتورة ${lockedInvoice.invoiceNumber}`,
      });

      // Validate revenue journal balance before creation
      const revenueValidation = LedgerValidator.validateLines(revenueLines);
      if (!revenueValidation.valid) {
        throw new Error(
          `قيد الإيراد غير متوازن: ${revenueValidation.errors.join(" | ")}`,
        );
      }

      const revenueJournal = await tx.journalEntry.create({
        data: {
          companyId,
          branchId: lockedInvoice.warehouse?.branchId || null,
          entryNumber: revenueEntryNumber,
          entryDate: invoiceDate,
          currency: lockedInvoice.currency,
          exchangeRateSnapshot: Number(
            lockedInvoice.exchangeRateSnapshot ??
              lockedInvoice.exchangeRateValue ??
              1,
          ),
          description: `إيراد مبيعات - فاتورة ${lockedInvoice.invoiceNumber}`,
          sourceType: "SalesInvoice",
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

      // --- COGS Journal Entry ---
      let cogsJournal = null;
      if (totalCogs > 0) {
        const cogsLines = [
          {
            accountId: cogsAccount.id,
            debit: totalCogs,
            credit: 0,
            description: `COGS - فاتورة ${lockedInvoice.invoiceNumber}`,
          },
          {
            accountId: inventoryAccount.id,
            debit: 0,
            credit: totalCogs,
            description: `مخزون - فاتورة ${lockedInvoice.invoiceNumber}`,
          },
        ];

        // Validate COGS journal balance before creation
        const cogsValidation = LedgerValidator.validateLines(cogsLines);
        if (!cogsValidation.valid) {
          throw new Error(
            `قيد COGS غير متوازن: ${cogsValidation.errors.join(" | ")}`,
          );
        }

        cogsJournal = await tx.journalEntry.create({
          data: {
            companyId,
            branchId: lockedInvoice.warehouse?.branchId || null,
            entryNumber: cogsEntryNumber,
            entryDate: invoiceDate,
            currency: lockedInvoice.currency,
            exchangeRateSnapshot: Number(
              lockedInvoice.exchangeRateSnapshot ??
                lockedInvoice.exchangeRateValue ??
                1,
            ),
            description: `تكلفة بضاعة مباعة - فاتورة ${lockedInvoice.invoiceNumber}`,
            sourceType: "SalesInvoiceCOGS",
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

      // --- Update customer balance if credit/mixed with remaining ---
      if (lockedInvoice.customerId && remaining > 0) {
        await tx.customer.update({
          where: { id: lockedInvoice.customerId },
          data: {
            currentBalance: { increment: remaining },
          },
        });
      }

      // --- Update PaymentAccount.balance for cash/mixed payments ---
      if (
        lockedInvoice.paymentType !== "CREDIT" &&
        paid > 0 &&
        lockedInvoice.paymentAccountId
      ) {
        await tx.paymentAccount.update({
          where: { id: lockedInvoice.paymentAccountId },
          data: { balance: { increment: paid } },
        });
      }

      // --- Update invoice to POSTED ---
      const postedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: "POSTED",
          postedAt: new Date(),
          postedById: currentUser.userId,
          journalEntryId: revenueJournal.id,
        },
        include: { items: true },
      });

      // --- Audit log inside transaction (must use tx, not external prisma) ---
      // Per AI_GLOBAL_RULES.md: Financial audit failure must fail the transaction.
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: "POST",
          entity: "Invoice",
          entityId: id,
          details: {
            invoiceNumber: lockedInvoice.invoiceNumber,
            companyId,
            totalAfterTax,
            totalCogs,
            paymentType: lockedInvoice.paymentType,
            revenueJournalId: revenueJournal.id,
            cogsJournalId: cogsJournal?.id,
            stockMovements: lineCogsMap.map((m) => m.movementId),
          } as never,
        },
      });

      return {
        invoice: postedInvoice,
        revenueJournal,
        cogsJournal,
        lineCogsMap,
      };
    });

    return successResponse({
      id: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      status: result.invoice.status,
      postedAt: result.invoice.postedAt,
      totalAfterTax: Number(invoice.totalAfterTax ?? 0),
      totalCogs: result.lineCogsMap.reduce((sum, l) => sum + l.cogs, 0),
      revenueJournalId: result.revenueJournal.id,
      cogsJournalId: result.cogsJournal?.id,
      stockMovementIds: result.lineCogsMap.map((l) => l.movementId),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "فشل ترحيل الفاتورة";
    console.error("Sales invoice posting error:", error);
    return errorResponse(message, 500);
  }
}
