import { z } from "zod";

export const customerFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  code: z.string().min(1, "كود العميل مطلوب"),
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().nullable(),
  address: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  customerType: z.enum([
    "INDIVIDUAL",
    "MARKET",
    "WHOLESALE",
    "AGENT",
    "ONLINE",
  ]),
  customerCategoryId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  creditLimit: z.coerce
    .number()
    .min(0, "حد الائتمان يجب أن يكون 0 أو أكثر")
    .default(0),
  openingBalanceIqd: z.coerce.number().default(0),
  openingBalanceUsd: z.coerce.number().default(0),
});

export const supplierFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  openingBalanceIqd: z.coerce.number().default(0),
  openingBalanceUsd: z.coerce.number().default(0),
});

export const customerCategoryFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().optional().nullable(),
});

export const productCategoryFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  name: z.string().min(1, "الاسم مطلوب"),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const unitSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  name: z.string().min(1, "الاسم مطلوب"),
  code: z.string().min(1, "كود الوحدة مطلوب"),
  symbol: z.string().optional().nullable(),
  type: z
    .enum(["PIECE", "BOX", "LITER", "KG", "OTHER"] as const)
    .default("PIECE"),
});

export const productFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  name: z.string().min(1, "الاسم مطلوب"),
  code: z.string().min(1, "كود المادة مطلوب"),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().min(1, "المجموعة مطلوبة"),
  unitId: z.string().min(1, "الوحدة مطلوبة"),
  packaging: z.enum(["قطعة", "كارتون"] as const),
  piecesPerCarton: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce
    .number()
    .min(0, "سعر الشراء يجب أن يكون 0 أو أكثر")
    .default(0),
  purchaseCurrency: z.enum(["USD", "IQD"] as const).default("IQD"),
  productType: z.enum(["STOCK", "SERVICE"] as const).default("STOCK"),
  description: z.string().optional().nullable(),
  prices: z
    .array(
      z.object({
        customerType: z.enum([
          "INDIVIDUAL",
          "MARKET",
          "WHOLESALE",
          "AGENT",
          "ONLINE",
        ]),
        price: z.coerce.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
        currency: z.enum(["USD", "IQD"] as const).default("IQD"),
      }),
    )
    .optional()
    .default([]),
});

export const warehouseFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  code: z.string().min(1, "كود المخزن مطلوب"),
  name: z.string().min(1, "الاسم مطلوب"),
  branchId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const stockMovementFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  productId: z.string().min(1, "المادة مطلوبة"),
  warehouseId: z.string().min(1, "المخزن مطلوب"),
  movementType: z.enum([
    "OPENING_BALANCE",
    "IN",
    "OUT",
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT",
    "TRANSFER_OUT",
    "TRANSFER_IN",
  ]),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون أكبر من 0"),
  unitCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.enum(["USD", "IQD"] as const).default("IQD"),
  movementDate: z.string().optional().nullable(),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const stockBalanceQuerySchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة").optional(),
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
});

export const stockTransferLineSchema = z.object({
  productId: z.string().min(1, "المادة مطلوبة"),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون أكبر من 0"),
  unitCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.enum(["USD", "IQD"] as const).default("IQD"),
  notes: z.string().optional().nullable(),
});

export const stockTransferFormSchema = z
  .object({
    companyId: z.string().min(1, "الشركة مطلوبة"),
    fromWarehouseId: z.string().min(1, "المخزن المصدر مطلوب"),
    toWarehouseId: z.string().min(1, "المخزن الوجهة مطلوب"),
    transferDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    lines: z
      .array(stockTransferLineSchema)
      .min(1, "يجب إضافة مادة واحدة على الأقل"),
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: "المخزن المصدر والوجهة يجب أن يكونا مختلفين",
    path: ["toWarehouseId"],
  });

export const stockAdjustmentLineSchema = z.object({
  productId: z.string().min(1, "المادة مطلوبة"),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون أكبر من 0"),
  unitCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.enum(["USD", "IQD"] as const).default("IQD"),
  notes: z.string().optional().nullable(),
});

export const stockAdjustmentFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  warehouseId: z.string().min(1, "المخزن مطلوب"),
  adjustmentType: z.enum(["IN", "OUT"]),
  adjustmentDate: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z
    .array(stockAdjustmentLineSchema)
    .min(1, "يجب إضافة مادة واحدة على الأقل"),
});

export const exchangeRateFormSchema = z.object({
  usdToIqd: z.coerce.number().min(1, "سعر الصرف مطلوب"),
  note: z.string().optional().nullable(),
});

export const purchaseInvoiceFormSchema = z.object({
  supplierInvoiceNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional(),
  currency: z.enum(["USD", "IQD"] as const),
  exchangeRateValue: z.coerce.number().min(0).default(0),
  supplierId: z.string().min(1, "المورد مطلوب"),
  warehouseId: z.string().min(1, "المخزن مطلوب"),
  notes: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "CREDIT"] as const).default("CASH"),
  paid: z.coerce.number().min(0).default(0),
  paymentAccountId: z.string().optional().nullable(),
});

// Phase 1 — Foundation Core Schemas

export const companyFormSchema = z.object({
  name: z.string().min(1, "اسم الشركة مطلوب"),
  code: z.string().min(1, "كود الشركة مطلوب"),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().nullable(),
});

export const branchFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  name: z.string().min(1, "اسم الفرع مطلوب"),
  code: z.string().min(1, "كود الفرع مطلوب"),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export const fiscalPeriodFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  branchId: z.string().optional().nullable(),
  name: z.string().min(1, "اسم الفترة مطلوب"),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
});

export const accountFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  code: z.string().min(1, "رقم الحساب مطلوب"),
  name: z.string().min(1, "اسم الحساب مطلوب"),
  parentId: z.string().optional().nullable(),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  subtype: z.string().optional().nullable(),
  normalBalance: z.enum(["DEBIT", "CREDIT"]).default("DEBIT"),
  currency: z.enum(["IQD", "USD"]).default("IQD"),
  isPosting: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  isProtected: z.boolean().default(false),
  allowManualJournal: z.boolean().default(true),
  description: z.string().optional().nullable(),
});

export const journalLineSchema = z.object({
  accountId: z.string().min(1, "الحساب مطلوب"),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  description: z.string().optional().nullable(),
});

export const journalEntryFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  branchId: z.string().optional().nullable(),
  fiscalPeriodId: z.string().optional().nullable(),
  entryDate: z.string().optional(),
  currency: z.enum(["IQD", "USD"]).default("IQD"),
  exchangeRateSnapshot: z.coerce.number().min(0).default(1),
  description: z.string().optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  lines: z.array(journalLineSchema).min(2, "يجب إضافة سطرين على الأقل"),
});

export type CompanyFormData = z.infer<typeof companyFormSchema>;
export type BranchFormData = z.infer<typeof branchFormSchema>;
export type FiscalPeriodFormData = z.infer<typeof fiscalPeriodFormSchema>;
export type AccountFormData = z.infer<typeof accountFormSchema>;
export type JournalLineInput = z.infer<typeof journalLineSchema>;
export type JournalEntryFormData = z.infer<typeof journalEntryFormSchema>;

export type CustomerFormData = z.infer<typeof customerFormSchema>;
export type SupplierFormData = z.infer<typeof supplierFormSchema>;
export type CustomerCategoryFormData = z.infer<
  typeof customerCategoryFormSchema
>;
export type ProductCategoryFormData = z.infer<typeof productCategoryFormSchema>;
export type UnitFormData = z.infer<typeof unitSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;
export type WarehouseFormData = z.infer<typeof warehouseFormSchema>;
export type StockMovementFormData = z.infer<typeof stockMovementFormSchema>;
export type StockTransferFormData = z.infer<typeof stockTransferFormSchema>;
export type StockTransferLineData = z.infer<typeof stockTransferLineSchema>;
export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentFormSchema>;
export type StockAdjustmentLineData = z.infer<typeof stockAdjustmentLineSchema>;
export type ExchangeRateFormData = z.infer<typeof exchangeRateFormSchema>;
export const salesInvoiceLineSchema = z.object({
  productId: z.string().min(1, "المادة مطلوبة"),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون أكبر من 0"),
  unitPrice: z.coerce.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const salesInvoiceFormSchema = z.object({
  companyId: z.string().min(1, "الشركة مطلوبة"),
  customerId: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
  currency: z.enum(["USD", "IQD"] as const).default("IQD"),
  exchangeRateValue: z.coerce.number().min(0).default(0),
  paymentType: z.enum(["CASH", "CREDIT", "MIXED"] as const).default("CASH"),
  paymentAccountId: z.string().optional().nullable(),
  paid: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  lines: z
    .array(salesInvoiceLineSchema)
    .min(1, "يجب إضافة مادة واحدة على الأقل"),
});

export type PurchaseInvoiceFormData = z.infer<typeof purchaseInvoiceFormSchema>;
export type SalesInvoiceFormData = z.infer<typeof salesInvoiceFormSchema>;
export type SalesInvoiceLineData = z.infer<typeof salesInvoiceLineSchema>;

export const customerCollectionSchema = z.object({
  customerId: z.string().min(1, "العميل مطلوب"),
  invoiceId: z.string().optional().nullable(),
  paymentAccountId: z.string().optional().nullable(),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من 0"),
  currency: z.enum(["IQD", "USD"]).default("IQD"),
  collectionDate: z.coerce.date().default(new Date()),
  notes: z.string().optional().nullable(),
});
