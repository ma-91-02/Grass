"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ChevronDown,
  ChevronLeft,
  Search,
  FolderTree,
  FileText,
  Ban,
  Plus,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  level: number;
  parentId: string | null;
  currency: string;
  isActive: boolean;
  isPosting: boolean;
  childrenCount: number;
  description: string | null;
}

interface AccountNode extends Account {
  children: AccountNode[];
}

interface AccountFormData {
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  currency: string;
  isPosting: boolean;
  description: string;
}

const emptyForm: AccountFormData = {
  code: "",
  name: "",
  type: "ASSET",
  parentId: null,
  currency: "IQD",
  isPosting: true,
  description: "",
};

const typeOptions = [
  { value: "ASSET", label: "أصل" },
  { value: "LIABILITY", label: "خصم" },
  { value: "EQUITY", label: "حقوق ملكية" },
  { value: "INCOME", label: "إيراد" },
  { value: "EXPENSE", label: "مصروف" },
];

const typeColors: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-700",
  LIABILITY: "bg-purple-100 text-purple-700",
  EQUITY: "bg-green-100 text-green-700",
  INCOME: "bg-emerald-100 text-emerald-700",
  EXPENSE: "bg-red-100 text-red-700",
};

const typeLabels: Record<string, string> = {
  ASSET: "أصل",
  LIABILITY: "خصم",
  EQUITY: "حقوق ملكية",
  INCOME: "إيراد",
  EXPENSE: "مصروف",
};

function buildTree(accounts: Account[]): AccountNode[] {
  const map = new Map<string, AccountNode>();
  const roots: AccountNode[] = [];

  for (const a of accounts) {
    map.set(a.id, { ...a, children: [] });
  }

  for (const a of accounts) {
    const node = map.get(a.id)!;
    if (a.parentId && map.has(a.parentId)) {
      map.get(a.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: AccountNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code));
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

function AccountFormModal({
  open,
  onClose,
  editingAccount,
  accounts,
  companyId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  editingAccount: Account | null;
  accounts: Account[];
  companyId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!editingAccount;
  const [form, setForm] = useState<AccountFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof AccountFormData, string>>>({});

  useEffect(() => {
    if (open) {
      if (editingAccount) {
        setForm({
          code: editingAccount.code,
          name: editingAccount.name,
          type: editingAccount.type,
          parentId: editingAccount.parentId,
          currency: editingAccount.currency,
          isPosting: editingAccount.isPosting,
          description: editingAccount.description || "",
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [open, editingAccount]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء الحساب");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إنشاء الحساب بنجاح", "success");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/accounts/${editingAccount!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          parentId: form.parentId,
          isPosting: form.isPosting,
          description: form.description || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث الحساب");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث الحساب بنجاح", "success");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const validate = (): boolean => {
    const e: Partial<Record<keyof AccountFormData, string>> = {};
    if (!isEditing) {
      if (!form.code.trim()) e.code = "رقم الحساب مطلوب";
      if (!form.name.trim()) e.name = "اسم الحساب مطلوب";
    } else {
      if (!form.name.trim()) e.name = "اسم الحساب مطلوب";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEditing) {
      editMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const parentOptions = accounts
    .filter((a) => a.id !== editingAccount?.id)
    .filter((a) => !a.isPosting || a.id === editingAccount?.parentId)
    .sort((a, b) => a.code.localeCompare(b.code));

  const loading = createMutation.isPending || editMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "تعديل حساب" : "حساب جديد"}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "جاري الحفظ..." : isEditing ? "حفظ التغييرات" : "إنشاء"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label className="mb-1 block text-sm">رقم الحساب *</Label>
          <Input
            placeholder="مثال: 110001"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            disabled={isEditing}
            className={isEditing ? "bg-gray-50" : ""}
          />
          {errors.code && (
            <p className="mt-1 text-xs text-red-500">{errors.code}</p>
          )}
          {isEditing && (
            <p className="mt-1 text-xs text-gray-400">
              لا يمكن تعديل رقم الحساب بعد الإنشاء
            </p>
          )}
        </div>

        <div>
          <Label className="mb-1 block text-sm">اسم الحساب *</Label>
          <Input
            placeholder="مثال: أصول ثابتة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
        </div>

        <div>
          <Label className="mb-1 block text-sm">نوع الحساب *</Label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            disabled={isEditing}
            className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
              isEditing ? "bg-gray-50" : ""
            }`}
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {isEditing && (
            <p className="mt-1 text-xs text-gray-400">
              لا يمكن تعديل نوع الحساب
            </p>
          )}
        </div>

        <div>
          <Label className="mb-1 block text-sm">الحساب الأب</Label>
          <select
            value={form.parentId || ""}
            onChange={(e) =>
              setForm({ ...form, parentId: e.target.value || null })
            }
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">— بدون أب (حساب رئيسي) —</option>
            {parentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="mb-1 block text-sm">العملة</Label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              disabled={isEditing}
              className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ${
                isEditing ? "bg-gray-50" : ""
              }`}
            >
              <option value="IQD">دينار عراقي</option>
              <option value="USD">دولار أمريكي</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <input
                type="checkbox"
                checked={form.isPosting}
                onChange={(e) =>
                  setForm({ ...form, isPosting: e.target.checked })
                }
                className="h-4 w-4"
              />
              <span className="text-sm">حساب ترحيل</span>
            </label>
          </div>
        </div>

        <div>
          <Label className="mb-1 block text-sm">ملاحظات</Label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={3}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            placeholder="وصف اختياري..."
          />
        </div>
      </div>
    </Dialog>
  );
}

function TreeNode({
  node,
  depth,
  search,
  onEdit,
  onDelete,
  onView,
}: {
  node: AccountNode;
  depth: number;
  search: string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onView: (account: Account) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  if (
    search &&
    !node.code.includes(search) &&
    !node.name.includes(search)
  ) {
    const matchInChildren = node.children.some(
      (c) => c.code.includes(search) || c.name.includes(search),
    );
    if (!matchInChildren) return null;
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 ${
          !node.isActive ? "opacity-60" : ""
        }`}
        style={{ paddingInlineStart: `${12 + depth * 24}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className={`rounded p-0.5 transition-colors hover:bg-muted ${
            hasChildren ? "visible" : "invisible"
          }`}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {hasChildren ? (
          <FolderTree className="h-4 w-4 text-amber-500" />
        ) : (
          <FileText className="h-4 w-4 text-gray-400" />
        )}

        <span className="min-w-[80px] font-mono text-sm text-gray-500">
          {node.code}
        </span>

        <span className="font-medium text-dark">{node.name}</span>

        <Badge className={typeColors[node.type] || "bg-gray-100 text-gray-700"}>
          {typeLabels[node.type] || node.type}
        </Badge>

        {node.isPosting && <Badge variant="info">ترحيل</Badge>}

        {hasChildren && !node.isPosting && (
          <Badge variant="warning">تجميعي</Badge>
        )}

        {!node.isActive && (
          <Badge variant="danger">
            <Ban className="ml-1 h-3 w-3" />
            غير نشط
          </Badge>
        )}

        <div className="mr-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onView(node)}
            className="rounded p-1 text-gray-400 hover:bg-muted hover:text-primary"
            title="عرض التفاصيل"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(node)}
            className="rounded p-1 text-gray-400 hover:bg-muted hover:text-blue-600"
            title="تعديل"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {!hasChildren && (
            <button
              onClick={() => onDelete(node)}
              className="rounded p-1 text-gray-400 hover:bg-muted hover:text-red-600"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              search={search}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {
        toast("تعذر التحقق من بيانات المستخدم", "error");
      });
  }, []);

  const openView = (account: Account) => {
    router.push(`/dashboard/accounts/${account.id}`);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/accounts?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الحسابات");
      return json.data as Account[];
    },
    enabled: !!userCompanyId,
  });

  const tree: AccountNode[] = useMemo(() => (data ? buildTree(data) : []), [data]);

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/accounts/${deleteTarget!.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الحساب");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف الحساب بنجاح", "success");
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الحسابات" description="شجرة الحسابات" />
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="الحسابات" description="شجرة الحسابات" />
        <Card>
          <CardContent className="py-12 text-center text-red-600">
            {error instanceof Error ? error.message : "فشل تحميل الحسابات"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحسابات"
        description="شجرة الحسابات"
        actionLabel="حساب جديد"
        onAction={openCreate}
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[280px] flex-1">
              <Label className="mb-2 block text-sm">بحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="كود الحساب أو الاسم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {tree.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {search ? "لا توجد نتائج للبحث" : "لا توجد حسابات"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tree.map((node: AccountNode) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  search={search}
                  onEdit={openEdit}
                  onDelete={(a) => setDeleteTarget(a)}
                  onView={openView}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && userCompanyId && (
        <AccountFormModal
          open={showForm}
          onClose={() => setShowForm(false)}
          editingAccount={editingAccount}
          accounts={data || []}
          companyId={userCompanyId}
          onSuccess={handleSuccess}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="حذف الحساب"
        message={`هل أنت متأكد من حذف الحساب "${deleteTarget?.name}" (${deleteTarget?.code})؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
