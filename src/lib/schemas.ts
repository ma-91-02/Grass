import { z } from "zod";

export const customerFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
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
  openingBalanceIqd: z.coerce.number().default(0),
  openingBalanceUsd: z.coerce.number().default(0),
});

export const supplierFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  openingBalanceIqd: z.coerce.number().default(0),
  openingBalanceUsd: z.coerce.number().default(0),
});

export const customerCategoryFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().optional().nullable(),
});

export const productFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  code: z.string().min(1, "كود المادة مطلوب"),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().min(1, "المجموعة مطلوبة"),
  packaging: z.enum(["قطعة", "كارتون"] as const),
  piecesPerCarton: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce
    .number()
    .min(0, "سعر الشراء يجب أن يكون 0 أو أكثر")
    .default(0),
  purchaseCurrency: z.enum(["USD", "IQD"] as const).default("IQD"),
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
  name: z.string().min(1, "الاسم مطلوب"),
  address: z.string().optional().nullable(),
});

export const exchangeRateFormSchema = z.object({
  usdToIqd: z.coerce.number().min(1, "سعر الصرف مطلوب"),
  note: z.string().optional().nullable(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;
export type SupplierFormData = z.infer<typeof supplierFormSchema>;
export type CustomerCategoryFormData = z.infer<typeof customerCategoryFormSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;
export type WarehouseFormData = z.infer<typeof warehouseFormSchema>;
export type ExchangeRateFormData = z.infer<typeof exchangeRateFormSchema>;
