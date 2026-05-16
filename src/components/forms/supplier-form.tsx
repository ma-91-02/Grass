"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierFormSchema, type SupplierFormData } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GOVERNORATES } from "@/lib/governorates";
import { parseNumericInput } from "@/lib/utils";

interface SupplierFormProps {
  defaultValues?: Partial<SupplierFormData>;
  onSubmit: (data: SupplierFormData) => Promise<void>;
}

export function SupplierForm({
  defaultValues,
  onSubmit,
}: SupplierFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(
      supplierFormSchema,
    ) as unknown as import("react-hook-form").Resolver<SupplierFormData>,
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      governorate: "",
      notes: "",
      openingBalanceIqd: 0,
      openingBalanceUsd: 0,
      ...defaultValues,
    },
  });

  function onArabicInput(e: React.FormEvent<HTMLInputElement>) {
    const target = e.target as HTMLInputElement;
    target.value = parseNumericInput(target.value);
  }

  return (
    <form id="supplier-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-dark border-b border-border pb-2">
          البيانات الأساسية
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="الاسم"
            error={errors.name?.message}
            {...register("name")}
            required
          />
          <Select
            label="المحافظة"
            options={[
              { value: "", label: "اختر محافظة" },
              ...GOVERNORATES.map((g) => ({
                value: g,
                label: g,
              })),
            ]}
            error={errors.governorate?.message}
            {...register("governorate")}
          />
          <Input
            label="رقم الهاتف"
            error={errors.phone?.message}
            {...register("phone")}
            dir="ltr"
          />
          <Input
            label="العنوان"
            error={errors.address?.message}
            {...register("address")}
          />
          <Input
            label="الملاحظات"
            error={errors.notes?.message}
            {...register("notes")}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-dark border-b border-border pb-2">
          الرصيد الافتتاحي
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="رصيد افتتاحي (دينار)"
            inputMode="decimal"
            error={errors.openingBalanceIqd?.message}
            {...register("openingBalanceIqd")}
            onInput={onArabicInput}
          />
          <Input
            label="رصيد افتتاحي (دولار)"
            inputMode="decimal"
            error={errors.openingBalanceUsd?.message}
            {...register("openingBalanceUsd")}
            onInput={onArabicInput}
          />
        </div>
      </div>
    </form>
  );
}
