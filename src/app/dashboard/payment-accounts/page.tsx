"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

interface PaymentAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  isActive: boolean;
}

export default function PaymentAccountsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("CASH");
  const [newCurrency, setNewCurrency] = useState("IQD");
  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/payment-accounts");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الحسابات");
      return json.data as PaymentAccount[];
    },
  });

  const accounts = data || [];

  const filtered = accounts.filter((a) => !search || a.name.includes(search));

  const createMutation = useMutation({
    mutationFn: async (body: {
      name: string;
      type: string;
      currency: string;
    }) => {
      const res = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء الحساب");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء الحساب بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["payment-accounts"] });
      setDialogOpen(false);
      setNewName("");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast("الاسم مطلوب", "error");
      return;
    }
    createMutation.mutate({
      name: newName,
      type: newType,
      currency: newCurrency,
    });
  };

  const columns: Column<PaymentAccount>[] = [
    {
      key: "name",
      header: "الاسم",
      render: (a) => <span className="font-medium">{a.name}</span>,
    },
    {
      key: "type",
      header: "النوع",
      render: (a) => (
        <Badge
          className={
            a.type === "CASH"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }
        >
          {a.type === "CASH" ? "نقدي" : "بنكي"}
        </Badge>
      ),
    },
    {
      key: "currency",
      header: "العملة",
      render: (a) => <span>{a.currency}</span>,
    },
    {
      key: "balance",
      header: "الرصيد",
      render: (a) => <span>{a.balance.toLocaleString()}</span>,
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (a) => (
        <Badge
          className={
            a.isActive
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }
        >
          {a.isActive ? "نشط" : "غير نشط"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="حسابات الدفع"
        description="إدارة حسابات التسديد والدفع"
        actionLabel="حساب جديد"
        onAction={() => setDialogOpen(true)}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم..."
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="حساب دفع جديد"
      >
        <div className="space-y-4 p-4">
          <div>
            <Label>الاسم *</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: صندوق المبيعات"
            />
          </div>
          <div>
            <Label>النوع</Label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              <option value="CASH">نقدي</option>
              <option value="BANK">بنكي</option>
            </select>
          </div>
          <div>
            <Label>العملة</Label>
            <select
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              <option value="IQD">دينار عراقي</option>
              <option value="USD">دولار أمريكي</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
