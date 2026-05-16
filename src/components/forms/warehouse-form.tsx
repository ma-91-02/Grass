"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { warehouseFormSchema, type WarehouseFormData } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface WarehouseFormProps {
  defaultValues?: Partial<WarehouseFormData>
  onSubmit: (data: WarehouseFormData) => Promise<void>
  loading?: boolean
}

export function WarehouseForm({ defaultValues, onSubmit, loading }: WarehouseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema) as any,
    defaultValues: {
      name: "",
      code: "",
      address: "",
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="اسم المخزن" error={errors.name?.message} {...register("name")} required />
        <Input label="كود المخزن" error={errors.code?.message} {...register("code")} required dir="ltr" />
        <Input label="العنوان" error={errors.address?.message} {...register("address")} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  )
}
