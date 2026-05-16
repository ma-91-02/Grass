"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productFormSchema, type ProductFormData } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CUSTOMER_TYPE_LABELS, CUSTOMER_TYPES, type CustomerType } from "@/types"
import { PERMISSIONS } from "@/lib/permissions"
import { useMemo } from "react"

interface Category {
  id: string
  name: string
}

interface Packaging {
  id: string
  name: string
  piecesPerCarton: number
}

interface ProductFormProps {
  defaultValues?: Partial<ProductFormData>
  onSubmit: (data: ProductFormData) => Promise<void>
  loading?: boolean
  categories: Category[]
  packagings: Packaging[]
  userPermissions: string[]
}

export function ProductForm({ defaultValues, onSubmit, loading, categories, packagings, userPermissions }: ProductFormProps) {
  const canViewPurchasePrice = userPermissions.includes(PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE)
  const canEditPrices = userPermissions.includes(PERMISSIONS.PRODUCTS_EDIT_PRICE)

  const defaultPrices = useMemo(() => {
    if (defaultValues?.prices && defaultValues.prices.length > 0) {
      return defaultValues.prices
    }
    return CUSTOMER_TYPES.map((t) => ({ customerType: t, price: 0 }))
  }, [defaultValues])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      name: "",
      barcode: "",
      categoryId: "",
      packagingId: "",
      piecesPerCarton: 0,
      unit: "قطعة",
      purchasePrice: 0,
      prices: defaultPrices,
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="اسم المادة" error={errors.name?.message} {...register("name")} required />
        <Input label="الباركود" error={errors.barcode?.message} {...register("barcode")} dir="ltr" />
        <Select
          label="المجموعة"
          options={[{ value: "", label: "بدون مجموعة" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          error={errors.categoryId?.message}
          {...register("categoryId")}
        />
        <Select
          label="التعبئة"
          options={[{ value: "", label: "بدون تعبئة" }, ...packagings.map((p) => ({ value: p.id, label: p.name }))]}
          error={errors.packagingId?.message}
          {...register("packagingId")}
        />
        <Input
          label="عدد القطع بالكارتون"
          type="number"
          error={errors.piecesPerCarton?.message}
          {...register("piecesPerCarton")}
        />
        <Input label="الوحدة" error={errors.unit?.message} {...register("unit")} />
        {canViewPurchasePrice && (
          <Input
            label="سعر الشراء"
            type="number"
            error={errors.purchasePrice?.message}
            {...register("purchasePrice")}
          />
        )}
      </div>

      {canEditPrices && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-dark">أسعار البيع حسب نوع العميل</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CUSTOMER_TYPES.map((type, idx) => (
              <div key={type}>
                <input type="hidden" {...register(`prices.${idx}.customerType`)} value={type} />
                <Input
                  label={CUSTOMER_TYPE_LABELS[type as CustomerType]}
                  type="number"
                  {...register(`prices.${idx}.price`)}
                  error={errors.prices?.[idx]?.price?.message}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  )
}
