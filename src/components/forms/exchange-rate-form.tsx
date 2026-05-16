"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  exchangeRateFormSchema,
  type ExchangeRateFormData,
} from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ExchangeRateFormProps {
  defaultValues?: Partial<ExchangeRateFormData>;
  onSubmit: (data: ExchangeRateFormData) => Promise<void>;
  loading?: boolean;
}

export function ExchangeRateForm({
  defaultValues,
  onSubmit,
  loading,
}: ExchangeRateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExchangeRateFormData>({
    resolver: zodResolver(
      exchangeRateFormSchema,
    ) as unknown as import("react-hook-form").Resolver<ExchangeRateFormData>,
    defaultValues: {
      usdToIqd: 0,
      note: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="سعر الصرف (USD → IQD)"
        type="number"
        step="0.01"
        error={errors.usdToIqd?.message}
        {...register("usdToIqd")}
        required
      />
      <Textarea
        label="ملاحظة"
        error={errors.note?.message}
        {...register("note")}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
