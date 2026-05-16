"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customerCategoryFormSchema,
  type CustomerCategoryFormData,
} from "@/lib/schemas";
import { Input } from "@/components/ui/input";

interface CustomerCategoryFormProps {
  defaultValues?: Partial<CustomerCategoryFormData>;
  onSubmit: (data: CustomerCategoryFormData) => Promise<void>;
}

export function CustomerCategoryForm({
  defaultValues,
  onSubmit,
}: CustomerCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerCategoryFormData>({
    resolver: zodResolver(
      customerCategoryFormSchema,
    ) as unknown as import("react-hook-form").Resolver<CustomerCategoryFormData>,
    defaultValues: {
      name: "",
      description: "",
      ...defaultValues,
    },
  });

  return (
    <form
      id="category-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <Input
        label="الاسم"
        error={errors.name?.message}
        {...register("name")}
        required
      />
      <Input
        label="الوصف"
        error={errors.description?.message}
        {...register("description")}
      />
    </form>
  );
}
