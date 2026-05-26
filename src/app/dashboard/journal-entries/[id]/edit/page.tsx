"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import type { AccountData } from "@/types";

interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  description: string | null;
}

interface JournalEntryDetail {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  currency: string;
  status: string;
  lines: JournalEntryLine[];
  companyId: string;
}

export default function JournalEntryEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [notDraftError, setNotDraftError] = useState(false);

  const [entryDate, setEntryDate] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: "", debit: 0, credit: 0, description: "" },
    { accountId: "", debit: 0, credit: 0, description: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const cid = d.data?.companyId || null;
        const perms: string[] = d.data?.permissions || [];
        setUserCompanyId(cid);
        setPermissions(perms);
      })
      .catch(() => {
        setAuthError("تعذر تحميل بيانات المستخدم");
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const {
    data: entry,
    isLoading: isLoadingEntry,
    error: entryError,
  } = useQuery({
    queryKey: ["journal-entry", id],
    queryFn: async () => {
      const res = await fetch(`/api/journal-entries/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل القيد");
      return json.data as JournalEntryDetail;
    },
  });

  useEffect(() => {
    if (entry) {
      if (entry.status !== "DRAFT") {
        setNotDraftError(true);
        return;
      }
      setNotDraftError(false);
      setEntryDate(
        entry.entryDate
          ? new Date(entry.entryDate).toISOString().split("T")[0]
          : "",
      );
      setCurrency(entry.currency);
      setDescription(entry.description || "");
      setLines(
        entry.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description || "",
        })),
      );
    }
  }, [entry]);

  const canEdit =
    permissions.includes("journals.create") || permissions.length === 0;

  const { data: allAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts", userCompanyId],
    queryFn: async () => {
      if (!userCompanyId) return [];
      const p = new URLSearchParams({ companyId: userCompanyId });
      const res = await fetch(`/api/accounts?${p.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الحسابات");
      return json.data as AccountData[];
    },
    enabled: !!userCompanyId,
  });

  const accounts = allAccounts.filter(
    (a) => a.isActive && a.isPosting && a.allowManualJournal,
  );

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = difference === 0 && totalDebit > 0;
  const hasEmptyAccount = lines.some((l) => !l.accountId);
  const hasInvalidLine = lines.some(
    (l) => l.accountId && l.debit > 0 && l.credit > 0,
  );
  const hasZeroLine = lines.some(
    (l) => l.accountId && l.debit === 0 && l.credit === 0,
  );
  const canSave =
    !hasEmptyAccount &&
    !hasInvalidLine &&
    !hasZeroLine &&
    isBalanced &&
    lines.length >= 2 &&
    !submitting;

  const addLine = () => {
    setLines([
      ...lines,
      { accountId: "", debit: 0, credit: 0, description: "" },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = <K extends keyof JournalLine>(
    index: number,
    field: K,
    value: JournalLine[K],
  ) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === "debit" && Number(value) > 0) {
      newLines[index].credit = 0 as JournalLine["credit"];
    }
    if (field === "credit" && Number(value) > 0) {
      newLines[index].debit = 0 as JournalLine["debit"];
    }
    setLines(newLines);
  };

  const handleSubmit = async () => {
    if (!userCompanyId) {
      toast("لم يتم تحديد الشركة", "error");
      return;
    }

    const errors: string[] = [];
    if (lines.length < 2) errors.push("يجب إضافة سطرين على الأقل");
    if (hasEmptyAccount) errors.push("يرجى اختيار حساب لكل بند");
    if (hasInvalidLine)
      errors.push("لا يمكن أن يحتوي البند على مدين ودائن معاً");
    if (hasZeroLine) errors.push("كل بند يجب أن يحتوي على مدين أو دائن");
    if (!isBalanced) errors.push("المدين لا يساوي الدائن");
    if (totalDebit === 0) errors.push("المدين يجب أن يكون أكبر من 0");

    if (errors.length > 0) {
      toast(errors.join(" | "), "error");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        companyId: userCompanyId,
        entryDate,
        currency,
        description: description || null,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description || null,
        })),
      };

      const res = await fetch(`/api/journal-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل تحديث القيد");
      }
      toast("تم تحديث القيد بنجاح", "success");
      router.push(`/dashboard/journal-entries/${id}`);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "فشل تحديث القيد",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = isLoadingAuth || isLoadingEntry;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError || entryError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/journal-entries")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تعديل قيد يومية</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {authError ||
            (entryError instanceof Error
              ? entryError.message
              : "فشل تحميل القيد")}
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/journal-entries")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تعديل قيد يومية</h1>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center text-yellow-700">
          القيد غير موجود
        </div>
      </div>
    );
  }

  if (notDraftError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/journal-entries/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PageHeader
            title="تعديل قيد يومية"
            description="تعديل بيانات مسودة القيد"
          />
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-8 text-center text-orange-700">
          لا يمكن تعديل قيد غير مسودة
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/journal-entries/${id}`)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PageHeader
            title="تعديل قيد يومية"
            description="تعديل بيانات مسودة القيد"
          />
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          لا تملك صلاحية تعديل القيد
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/journal-entries/${id}`)}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={`تعديل قيد ${entry.entryNumber}`}
          description="تعديل بيانات مسودة القيد"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات القيد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>العملة</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
          </div>
          <div>
            <Label>الوصف</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              rows={2}
              placeholder="وصف القيد..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>بنود القيد</CardTitle>
          <Button type="button" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4" />
            إضافة بند
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountsLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          {!accountsLoading && accounts.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
              لا توجد حسابات متاحة للقيد اليدوي. الرجاء التأكد من وجود حسابات
              نشطة وقابلة للترحيل وتسمح بالقيد اليدوي.
            </div>
          )}
          {!accountsLoading && accounts.length > 0 && (
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
                    <th className="w-10 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr
                      key={index}
                      className="border-b border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-2">
                        <select
                          value={line.accountId}
                          onChange={(e) =>
                            updateLine(index, "accountId", e.target.value)
                          }
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                        >
                          <option value="">اختر الحساب...</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) =>
                            updateLine(index, "description", e.target.value)
                          }
                          placeholder="اختياري"
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={line.debit || ""}
                          onChange={(e) =>
                            updateLine(index, "debit", Number(e.target.value))
                          }
                          className="w-28"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={line.credit || ""}
                          onChange={(e) =>
                            updateLine(index, "credit", Number(e.target.value))
                          }
                          className="w-28"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {lines.length > 2 && (
                          <button
                            onClick={() => removeLine(index)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!accountsLoading && accounts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/30 p-4">
              <div className="space-y-1 text-sm">
                <p>
                  مجموع المدين:{" "}
                  <span className="font-bold text-dark">
                    {totalDebit.toLocaleString()}
                  </span>
                </p>
                <p>
                  مجموع الدائن:{" "}
                  <span className="font-bold text-dark">
                    {totalCredit.toLocaleString()}
                  </span>
                </p>
                <p>
                  الفرق:{" "}
                  <span
                    className={`font-bold ${
                      isBalanced ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {difference.toLocaleString()}
                  </span>
                  {isBalanced && totalDebit > 0 && (
                    <span className="mr-2 text-green-600">✓ متوازن</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {!accountsLoading && accounts.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {lines.length < 2 && (
                <span className="text-red-500">
                  يجب إضافة سطرين على الأقل
                </span>
              )}
              {hasEmptyAccount && (
                <span className="text-red-500">اختر حساباً لكل بند</span>
              )}
              {hasInvalidLine && (
                <span className="text-red-500">
                  لا يمكن مدين ودائن معاً في نفس البند
                </span>
              )}
              {hasZeroLine && (
                <span className="text-red-500">
                  كل بند يجب أن يحتوي على مدين أو دائن
                </span>
              )}
              {!isBalanced && totalDebit > 0 && (
                <span className="text-red-500">القيد غير متوازن</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/journal-entries/${id}`)}
        >
          إلغاء
        </Button>
        <Button onClick={handleSubmit} disabled={!canSave}>
          {submitting ? "جاري الحفظ..." : "حفظ التعديلات"}
        </Button>
      </div>
    </div>
  );
}
