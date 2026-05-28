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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.SALES_CANCEL))
  ) {
    return forbiddenError("لا تملك صلاحية إلغاء فاتورة بيع");
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
      },
      customer: true,
      warehouse: true,
      company: true,
    },
  });

  if (!invoice) return notFoundError();

  if (
    invoice.companyId &&
    !(await canAccessCompany(currentUser, invoice.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (invoice.status !== "POSTED") {
    return errorResponse(
      invoice.status === "CANCELLED"
        ? "الفاتورة ملغاة مسبقاً"
        : "يمكن إلغاء الفواتير المرحلة فقط",
      403,
    );
  }

  if (!invoice.postedAt) {
    return errorResponse("الفاتورة لم يتم ترحيلها", 400);
  }

  const cancelDate = new Date();

  const periodCheck = await PeriodGuard.checkPeriodOpen(
    invoice.companyId!,
    cancelDate,
    invoice.warehouse?.branchId || undefined,
  );
  if (!periodCheck.allowed) {
    return errorResponse(periodCheck.error!, 423);
  }

  if (!invoice.warehouse?.isActive) {
    return errorResponse("المخزن غير نشط", 400);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;

      const lockedInvoice = await tx.invoice.findUnique({
        where: { id },
        include: {
          items: {
            where: { stockMovementId: { not: null } },
          },
          customer: true,
        },
      });

      if (!lockedInvoice || lockedInvoice.status !== "POSTED") {
        throw new Error("الفاتورة تم تعديلها قبل الإلغاء");
      }

      const companyId = lockedInvoice.companyId!;
      const totalAfterTax = Number(lockedInvoice.totalAfterTax ?? 0);
      const remaining = Number(lockedInvoice.remaining ?? 0);

      for (const item of lockedInvoice.items) {
        if (!item.stockMovementId) continue;

        const movement = await tx.stockMovement.findUnique({
          where: { id: item.stockMovementId },
        });
        if (!movement) continue;

        const returnMovement = await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            warehouseId: lockedInvoice.warehouseId!,
            movementType: "RETURN_IN",
            quantity: movement.quantity,
            unitCost: Number(movement.unitCost ?? 0),
            currency: movement.currency,
            movementDate: cancelDate,
            referenceType: "SalesInvoice",
            referenceId: id,
            reason: "Cancel",
            status: "DRAFT",
            createdById: currentUser.userId,
          },
        });

        const applyResult = await StockBalanceService.applyPostedMovement(
          tx,
          returnMovement.id,
        );
        if (!applyResult.success) {
          throw new Error(applyResult.error || "فشل إعادة المخزون");
        }
      }

      const revenueJournal = lockedInvoice.journalEntryId
        ? await tx.journalEntry.findUnique({
            where: { id: lockedInvoice.journalEntryId },
            include: { lines: true },
          })
        : null;

      if (revenueJournal) {
        const reverseLines = revenueJournal.lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.credit),
          credit: Number(l.debit),
          description: `عكس إيراد - فاتورة ${lockedInvoice.invoiceNumber}`,
        }));

        const reverseValidation = LedgerValidator.validateLines(reverseLines);
        if (!reverseValidation.valid) {
          throw new Error(
            `قيد العكس غير متوازن: ${reverseValidation.errors.join(" | ")}`,
          );
        }

        const jeCount = await tx.journalEntry.count({ where: { companyId } });
        const reversalEntryNumber = `JE-${String(jeCount + 1).padStart(5, "0")}`;

        await tx.journalEntry.create({
          data: {
            companyId,
            branchId: invoice.warehouse?.branchId || null,
            entryNumber: reversalEntryNumber,
            entryDate: cancelDate,
            currency: revenueJournal.currency,
            exchangeRateSnapshot: Number(revenueJournal.exchangeRateSnapshot ?? 1),
            description: `عكس إيراد - فاتورة ${lockedInvoice.invoiceNumber}`,
            sourceType: "SalesInvoiceCancel",
            sourceId: id,
            status: "POSTED",
            postedAt: new Date(),
            reversalEntryId: revenueJournal.id,
            createdById: currentUser.userId,
            lines: {
              create: reverseLines.map((l) => ({
                accountId: l.accountId,
                debit: l.debit,
                credit: l.credit,
                description: l.description,
              })),
            },
          },
        });

        await tx.journalEntry.update({
          where: { id: revenueJournal.id },
          data: { reversedAt: new Date() },
        });
      }

      // --- Reverse COGS journal entry ---
      const cogsJournal = lockedInvoice.journalEntryId
        ? await tx.journalEntry.findFirst({
            where: {
              sourceType: "SalesInvoiceCOGS",
              sourceId: id,
              reversedAt: null,
            },
            include: { lines: true },
          })
        : null;

      if (cogsJournal) {
        const cogsReverseLines = cogsJournal.lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.credit),
          credit: Number(l.debit),
          description: `عكس COGS - فاتورة ${lockedInvoice.invoiceNumber}`,
        }));

        const cogsReverseValidation =
          LedgerValidator.validateLines(cogsReverseLines);
        if (!cogsReverseValidation.valid) {
          throw new Error(
            `قيد عكس COGS غير متوازن: ${cogsReverseValidation.errors.join(" | ")}`,
          );
        }

        const cogsJeCount = await tx.journalEntry.count({
          where: { companyId },
        });
        const cogsReversalNumber = `JE-${String(cogsJeCount + 1).padStart(5, "0")}`;

        await tx.journalEntry.create({
          data: {
            companyId,
            branchId: invoice.warehouse?.branchId || null,
            entryNumber: cogsReversalNumber,
            entryDate: cancelDate,
            currency: cogsJournal.currency,
            exchangeRateSnapshot: Number(
              cogsJournal.exchangeRateSnapshot ?? 1,
            ),
            description: `عكس COGS - فاتورة ${lockedInvoice.invoiceNumber}`,
            sourceType: "SalesInvoiceCancel",
            sourceId: id,
            status: "POSTED",
            postedAt: new Date(),
            reversalEntryId: cogsJournal.id,
            createdById: currentUser.userId,
            lines: {
              create: cogsReverseLines.map((l) => ({
                accountId: l.accountId,
                debit: l.debit,
                credit: l.credit,
                description: l.description,
              })),
            },
          },
        });

        await tx.journalEntry.update({
          where: { id: cogsJournal.id },
          data: { reversedAt: new Date() },
        });
      }

      if (lockedInvoice.customerId && remaining > 0) {
        await tx.customer.update({
          where: { id: lockedInvoice.customerId },
          data: {
            currentBalance: { decrement: remaining },
          },
        });
      }

      // --- Reverse PaymentAccount.balance for cash/mixed payments ---
      const paidAmount = Number(lockedInvoice.paid ?? 0);
      if (
        lockedInvoice.paymentType !== "CREDIT" &&
        paidAmount > 0 &&
        lockedInvoice.paymentAccountId
      ) {
        await tx.paymentAccount.update({
          where: { id: lockedInvoice.paymentAccountId },
          data: { balance: { decrement: paidAmount } },
        });
      }

      const cancelledInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: "CANCELLED",
          paid: 0,
          remaining: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: "CANCEL",
          entity: "Invoice",
          entityId: id,
          details: {
            invoiceNumber: lockedInvoice.invoiceNumber,
            companyId,
            totalAfterTax,
            action: "Cancelled with stock return and journal reversal",
          } as never,
        },
      });

      return { invoice: cancelledInvoice };
    });

    return successResponse({
      id: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      status: result.invoice.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "فشل إلغاء الفاتورة";
    console.error("Sales invoice cancel error:", error);
    return errorResponse(message, 500);
  }
}
