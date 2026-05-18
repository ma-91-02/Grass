"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerFormSchema, type CustomerFormData } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CUSTOMER_TYPE_LABELS, CUSTOMER_TYPES } from "@/types";
import { GOVERNORATES } from "@/lib/governorates";
import { parseNumericInput } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface CustomerFormProps {
  defaultValues?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  categories: Category[];
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  categories,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(
      customerFormSchema,
    ) as unknown as import("react-hook-form").Resolver<CustomerFormData>,
    defaultValues: {
      name: "",
      phone: "",
      whatsapp: "",
      address: "",
      governorate: "",
      customerType: "INDIVIDUAL",
      customerCategoryId: "",
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
    <form
      id="customer-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <div>
        <h3 className="mb-3 text-sm font-semibold text-dark border-b border-border pb-2">
          البيانات الأساسية
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="كود العميل"
            error={errors.code?.message}
            {...register("code")}
            required
          />
          <Input
            label="الاسم"
            error={errors.name?.message}
            {...register("name")}
            required
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            error={errors.email?.message}
            {...register("email")}
            dir="ltr"
          />
          <Select
            label="نوع العميل"
            options={CUSTOMER_TYPES.map((t) => ({
              value: t,
              label: CUSTOMER_TYPE_LABELS[t],
            }))}
            error={errors.customerType?.message}
            {...register("customerType")}
          />
          <Select
            label="قسم العميل"
            options={[
              { value: "", label: "بدون قسم" },
              ...categories.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
            error={errors.customerCategoryId?.message}
            {...register("customerCategoryId")}
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
            label="واتساب"
            error={errors.whatsapp?.message}
            {...register("whatsapp")}
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
          <Input
            label="حد الائتمان"
            type="number"
            min={0}
            error={errors.creditLimit?.message}
            {...register("creditLimit")}
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
