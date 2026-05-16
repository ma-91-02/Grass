import { z } from "zod"
import { CUSTOMER_TYPES } from "@/types"

export const customerFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  customerType: z.enum(["INDIVIDUAL", "MARKET", "WHOLESALE", "AGENT", "ONLINE"]),
  creditLimit: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
})

export const productFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  packagingId: z.string().optional().nullable(),
  piecesPerCarton: z.coerce.number().min(0).default(0),
  unit: z.string().optional().default("قطعة"),
  purchasePrice: z.coerce.number().min(0, "سعر الشراء يجب أن يكون 0 أو أكثر").default(0),
  prices: z.array(z.object({
    customerType: z.enum(["INDIVIDUAL", "MARKET", "WHOLESALE", "AGENT", "ONLINE"]),
    price: z.coerce.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  })).optional().default([]),
})

export const warehouseFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  address: z.string().optional().nullable(),
})

export const exchangeRateFormSchema = z.object({
  usdToIqd: z.coerce.number().min(1, "سعر الصرف مطلوب"),
  note: z.string().optional().nullable(),
})

export type CustomerFormData = z.infer<typeof customerFormSchema>
export type ProductFormData = z.infer<typeof productFormSchema>
export type WarehouseFormData = z.infer<typeof warehouseFormSchema>
export type ExchangeRateFormData = z.infer<typeof exchangeRateFormSchema>
