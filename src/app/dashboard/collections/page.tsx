"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Printer } from "lucide-react";

interface Collection {
  id: string;
  collectionNumber: string;
  collectionDate: string;
  customerName: string | null;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
}

export default function CollectionsPage() {
  const [search, setSearch] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["collections", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      params.append("limit", "100");
      const res = await fetch(`/api/customer-collections?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل التحصيلات");
      return (json.data?.data || []) as Collection[];
    },
    enabled: !!userCompanyId,
  });

  const collections = data || [];

  const filtered = collections.filter(
    (c) =>
      !search ||
      c.collectionNumber?.includes(search) ||
      c.customerName?.includes(search) ||
      c.invoiceNumber?.includes(search),
  );

  const columns: Column<Collection>[] = [
    {
      key: "collectionNumber",
      header: "رقم التحصيل",
      render: (c) => <span className="font-medium">{c.collectionNumber}</span>,
    },
    {
      key: "collectionDate",
      header: "التاريخ",
      render: (c) => (
        <span>{new Date(c.collectionDate).toLocaleDateString("ar-IQ")}</span>
      ),
    },
    {
      key: "customerName",
      header: "العميل",
      render: (c) => <span>{c.customerName || "—"}</span>,
    },
    {
      key: "invoiceNumber",
      header: "الفاتورة",
      render: (c) => <span>{c.invoiceNumber || "—"}</span>,
    },
    {
      key: "amount",
      header: "المبلغ",
      render: (c) => (
        <span className="font-medium">
          {c.amount.toLocaleString()} {c.currency}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="التحصيلات"
        description="تحصيل مدفوعات العملاء"
        actionLabel="تحصيل جديد"
        onAction={() => {
          window.location.href = "/dashboard/collections/new";
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث برقم التحصيل أو اسم العميل..."
        extraActions={[
          {
            label: "طباعة",
            onClick: (c) => {
              window.open(`/api/customer-collections/${c.id}/print`, "_blank");
            },
            icon: <Printer className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  );
}
