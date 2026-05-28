"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";

interface Payment {
  id: string;
  paymentDate: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
}

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["payments", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      params.append("limit", "100");
      const res = await fetch(`/api/payments?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المدفوعات");
      return (json.data?.data || []) as Payment[];
    },
    enabled: !!userCompanyId,
  });

  const payments = data || [];

  const filtered = payments.filter(
    (p) =>
      !search ||
      p.id?.includes(search) ||
      p.supplierName?.includes(search) ||
      p.invoiceNumber?.includes(search),
  );

  const columns: Column<Payment>[] = [
    {
      key: "id",
      header: "رقم الدفع",
      render: (p) => (
        <span className="font-medium text-xs font-mono">
          {p.id.slice(-8)}
        </span>
      ),
    },
    {
      key: "paymentDate",
      header: "التاريخ",
      render: (p) => (
        <span>{new Date(p.paymentDate).toLocaleDateString("ar-IQ")}</span>
      ),
    },
    {
      key: "supplierName",
      header: "المورد",
      render: (p) => <span>{p.supplierName || "—"}</span>,
    },
    {
      key: "invoiceNumber",
      header: "الفاتورة",
      render: (p) => <span>{p.invoiceNumber || "—"}</span>,
    },
    {
      key: "amount",
      header: "المبلغ",
      render: (p) => (
        <span className="font-medium">
          {p.amount.toLocaleString()} {p.currency}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="المدفوعات"
        description="دفع مستحقات الموردين"
        actionLabel="دفع جديد"
        onAction={() => {
          window.location.href = "/dashboard/payments/new";
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث برقم الدفع أو اسم المورد..."
      />
    </div>
  );
}
