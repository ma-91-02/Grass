"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Receipt, Printer, Eye } from "lucide-react";
import Link from "next/link";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string | null;
  warehouseName: string | null;
  currency: string;
  paymentType: string;
  totalAfterTax: number;
  paid: number;
  remaining: number;
  status: string;
}

export default function SalesInvoicesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sales-invoices", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      params.append("limit", "100");
      const res = await fetch(`/api/sales-invoices?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الفواتير");
      return (json.data?.data || []) as Invoice[];
    },
    enabled: !!userCompanyId,
  });

  const invoices = data || [];

  const filtered = invoices.filter(
    (inv) =>
      !search ||
      inv.invoiceNumber?.includes(search) ||
      inv.customerName?.includes(search),
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
      POSTED: { label: "مرحّل", color: "bg-green-100 text-green-700" },
      CANCELLED: { label: "ملغى", color: "bg-red-100 text-red-700" },
    };
    const s = map[status] || { label: status, color: "bg-gray-100" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const paymentBadge = (type: string) => {
    const map: Record<string, string> = {
      CASH: "نقدي",
      CREDIT: "آجل",
      MIXED: "مختلط",
    };
    return <span className="text-sm">{map[type] || type}</span>;
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "رقم الفاتورة",
      render: (inv) => <span className="font-medium">{inv.invoiceNumber}</span>,
    },
    {
      key: "invoiceDate",
      header: "التاريخ",
      render: (inv) => (
        <span>{new Date(inv.invoiceDate).toLocaleDateString("ar-IQ")}</span>
      ),
    },
    {
      key: "customerName",
      header: "العميل",
      render: (inv) => <span>{inv.customerName || "—"}</span>,
    },
    {
      key: "paymentType",
      header: "نوع الدفع",
      render: (inv) => paymentBadge(inv.paymentType),
    },
    {
      key: "totalAfterTax",
      header: "المجموع",
      render: (inv) => (
        <span>
          {inv.totalAfterTax.toLocaleString()} {inv.currency}
        </span>
      ),
    },
    {
      key: "remaining",
      header: "المتبقي",
      render: (inv) => (
        <span className={inv.remaining > 0 ? "text-amber-600" : ""}>
          {inv.remaining.toLocaleString()} {inv.currency}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (inv) => statusBadge(inv.status),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="فواتير البيع"
        description="إنشاء وإدارة فواتير البيع"
        actionLabel="فاتورة جديدة"
        onAction={() => {
          window.location.href = "/dashboard/sales-invoices/new";
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث برقم الفاتورة أو اسم العميل..."
        onView={(inv) => {
          window.location.href = `/dashboard/sales-invoices/${inv.id}`;
        }}
        viewLabel="عرض التفاصيل"
        extraActions={[
          {
            label: "طباعة",
            onClick: (inv) => {
              window.open(`/api/sales-invoices/${inv.id}/print`, "_blank");
            },
            icon: <Printer className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  );
}
