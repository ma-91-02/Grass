"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  currency: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  sourceType: string | null;
  lineCount: number;
}

interface JournalLine {
  id: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  description: string | null;
}

export default function JournalEntriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryLines, setEntryLines] = useState<JournalLine[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["journal-entries", userCompanyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      if (statusFilter) params.append("status", statusFilter);
      params.append("limit", "100");
      const res = await fetch(`/api/journal-entries?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل القيود");
      return (json.data?.data || []) as JournalEntry[];
    },
    enabled: !!userCompanyId,
  });

  const entries = data || [];

  const filtered = entries.filter((e) => {
    const matchesSearch =
      !search ||
      e.entryNumber?.includes(search) ||
      e.description?.includes(search);
    const matchesStatus = !statusFilter || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
      POSTED: { label: "مرحّل", color: "bg-green-100 text-green-700" },
      REVERSED: { label: "ملغى", color: "bg-red-100 text-red-700" },
    };
    const s = map[status] || { label: status, color: "bg-gray-100" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const viewEntry = async (entry: JournalEntry) => {
    setSelectedEntry(entry);
    try {
      const res = await fetch(`/api/journal-entries/${entry.id}`);
      const json = await res.json();
      if (json.success) {
        setEntryLines(json.data?.lines || []);
      }
    } catch {
      setEntryLines([]);
    }
  };

  const columns: Column<JournalEntry>[] = [
    {
      key: "entryNumber",
      header: "رقم القيد",
      render: (e) => <span className="font-medium">{e.entryNumber}</span>,
    },
    {
      key: "entryDate",
      header: "التاريخ",
      render: (e) => (
        <span>{new Date(e.entryDate).toLocaleDateString("ar-IQ")}</span>
      ),
    },
    {
      key: "description",
      header: "الوصف",
      render: (e) => <span className="text-sm">{e.description || "—"}</span>,
    },
    {
      key: "currency",
      header: "العملة",
      render: (e) => <span>{e.currency}</span>,
    },
    {
      key: "totalDebit",
      header: "مدين",
      render: (e) => <span>{e.totalDebit.toLocaleString()}</span>,
    },
    {
      key: "totalCredit",
      header: "دائن",
      render: (e) => <span>{e.totalCredit.toLocaleString()}</span>,
    },
    {
      key: "status",
      header: "الحالة",
      render: (e) => statusBadge(e.status),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="القيود اليومية"
        description="عرض القيود المحاسبية"
        actionLabel="قيد جديد"
        onAction={() => router.push("/dashboard/journal-entries/new")}
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-2 block text-sm">بحث</Label>
              <Input
                placeholder="رقم القيد أو الوصف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[200px]">
              <Label className="mb-2 block text-sm">الحالة</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">الكل</option>
                <option value="DRAFT">مسودة</option>
                <option value="POSTED">مرحّل</option>
                <option value="REVERSED">ملغى</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        extraActions={[
          {
            label: "عرض التفاصيل",
            onClick: (e) => viewEntry(e),
            icon: <Eye className="h-4 w-4" />,
          },
        ]}
      />

      {selectedEntry && (
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل القيد {selectedEntry.entryNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      الحساب
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      الوصف
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      مدين
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      دائن
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entryLines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium">{line.accountName}</p>
                        <p className="text-xs text-gray-500">
                          {line.accountCode}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {line.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {line.debit > 0 ? line.debit.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {line.credit > 0 ? line.credit.toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {entryLines.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        لا توجد بنود
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
