"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";

interface SalesReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  customerName: string | null;
  originalInvoiceNumber: string | null;
  totalAmount: number;
  status: string;
  currency: string;
}

export default function SalesReturnsPage() {
  const [search, setSearch] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sales-returns", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      params.append("limit", "100");
      const res = await fetch(`/api/sales-returns?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المرتجعات");
      return json.data as SalesReturn[];
    },
    enabled: !!userCompanyId,
  });

  const returns = data || [];

  const filtered = returns.filter(
    (r) =>
      !search ||
      r.returnNumber?.includes(search) ||
      r.customerName?.includes(search) ||
      r.originalInvoiceNumber?.includes(search),
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

  const columns: Column<SalesReturn>[] = [
    {
      key: "returnNumber",
      header: "رقم المرتجع",
      render: (r) => <span className="font-medium">{r.returnNumber}</span>,
    },
    {
      key: "returnDate",
      header: "التاريخ",
      render: (r) => (
        <span>{new Date(r.returnDate).toLocaleDateString("ar-IQ")}</span>
      ),
    },
    {
      key: "customerName",
      header: "العميل",
      render: (r) => <span>{r.customerName || "—"}</span>,
    },
    {
      key: "originalInvoiceNumber",
      header: "الفاتورة الأصلية",
      render: (r) => <span>{r.originalInvoiceNumber || "—"}</span>,
    },
    {
      key: "totalAmount",
      header: "المبلغ",
      render: (r) => (
        <span className="font-medium">
          {r.totalAmount.toLocaleString()} {r.currency}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (r) => statusBadge(r.status),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="مرتجعات المبيعات"
        description="إدارة مرتجعات البيع"
        actionLabel="مرتجع جديد"
        onAction={() => {
          window.location.href = "/dashboard/sales-returns/new";
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث برقم المرتجع أو اسم العميل..."
        onView={(r) => {
          window.location.href = `/dashboard/sales-returns/${r.id}`;
        }}
        viewLabel="عرض التفاصيل"
        extraActions={[
          {
            label: "طباعة",
            onClick: (r) => {
              window.open(`/api/sales-returns/${r.id}/print`, "_blank");
            },
            icon: <Printer className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  );
}
