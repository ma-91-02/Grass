"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Send } from "lucide-react";

interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  description: string | null;
}

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
  lines: JournalLine[];
}

export default function JournalEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = params.id as string;
  const [showPostConfirm, setShowPostConfirm] = useState(false);

  const {
    data: entry,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["journal-entry", id],
    queryFn: async () => {
      const res = await fetch(`/api/journal-entries/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل القيد");
      return json.data as JournalEntry;
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/journal-entries/${id}/post`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل ترحيل القيد");
      return json.data;
    },
    onSuccess: () => {
      toast("تم ترحيل القيد بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["journal-entry", id] });
      setShowPostConfirm(false);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setShowPostConfirm(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {error instanceof Error ? error.message : "فشل تحميل القيد"}
      </div>
    );
  }

  const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = totalDebit === totalCredit;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
      POSTED: { label: "مرحّل", color: "bg-green-100 text-green-700" },
      REVERSED: { label: "ملغى", color: "bg-red-100 text-red-700" },
    };
    const s = map[status] || { label: status, color: "bg-gray-100" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/journal-entries")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-dark">
            قيد {entry.entryNumber}
          </h1>
          <p className="text-sm text-gray-500">{statusBadge(entry.status)}</p>
        </div>
        <div className="flex gap-2">
          {entry.status === "DRAFT" && isBalanced && (
            <Button
              onClick={() => setShowPostConfirm(true)}
              disabled={postMutation.isPending}
            >
              <Send className="h-4 w-4" />
              {postMutation.isPending ? "جاري الترحيل..." : "ترحيل"}
            </Button>
          )}
          {entry.status === "DRAFT" && !isBalanced && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              القيد غير متوازن
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>تفاصيل القيد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">رقم القيد</p>
                <p className="font-medium">{entry.entryNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">التاريخ</p>
                <p className="font-medium">
                  {new Date(entry.entryDate).toLocaleDateString("ar-IQ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">العملة</p>
                <p className="font-medium">{entry.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المصدر</p>
                <p className="font-medium">{entry.sourceType || "يدوي"}</p>
              </div>
            </div>
            {entry.description && (
              <div>
                <p className="text-sm text-gray-500">الوصف</p>
                <p className="font-medium">{entry.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ملخص المبالغ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">مجموع المدين</span>
              <span className="font-medium">
                {totalDebit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">مجموع الدائن</span>
              <span className="font-medium">
                {totalCredit.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="font-bold">الحالة</span>
                <span
                  className={`font-bold ${
                    isBalanced ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isBalanced ? "متوازن" : "غير متوازن"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بنود القيد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    #
                  </th>
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
                {entry.lines.map((line, idx) => (
                  <tr
                    key={line.id}
                    className="border-b border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 text-sm text-dark">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-dark">
                      <p className="font-medium">{line.accountName}</p>
                      <p className="text-xs text-gray-500">
                        {line.accountCode}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {line.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {line.debit > 0
                        ? line.debit.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark">
                      {line.credit > 0
                        ? line.credit.toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
                {entry.lines.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
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

      <ConfirmDialog
        open={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        onConfirm={() => postMutation.mutate()}
        title="ترحيل القيد"
        message={`هل أنت متأكد من ترحيل القيد ${entry.entryNumber}؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="ترحيل"
        loading={postMutation.isPending}
      />
    </div>
  );
}
