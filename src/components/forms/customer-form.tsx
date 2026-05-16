"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { customerFormSchema, type CustomerFormData } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CUSTOMER_TYPE_LABELS, CUSTOMER_TYPES } from "@/types"

interface CustomerFormProps {
  defaultValues?: Partial<CustomerFormData>
  onSubmit: (data: CustomerFormData) => Promise<void>
  loading?: boolean
}

export function CustomerForm({ defaultValues, onSubmit, loading }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      whatsapp: "",
      address: "",
      customerType: "INDIVIDUAL",
      creditLimit: 0,
      notes: "",
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="الاسم" error={errors.name?.message} {...register("name")} required />
        <Select
          label="نوع العميل"
          options={CUSTOMER_TYPES.map((t) => ({ value: t, label: CUSTOMER_TYPE_LABELS[t] }))}
          error={errors.customerType?.message}
          {...register("customerType")}
        />
        <Input label="رقم الهاتف" error={errors.phone?.message} {...register("phone")} dir="ltr" />
        <Input label="واتساب" error={errors.whatsapp?.message} {...register("whatsapp")} dir="ltr" />
        <Input label="العنوان" error={errors.address?.message} {...register("address")} />
        <Input
          label="الحد الائتماني"
          type="number"
          error={errors.creditLimit?.message}
          {...register("creditLimit")}
        />
      </div>
      <Textarea label="ملاحظات" error={errors.notes?.message} {...register("notes")} />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  )
}
