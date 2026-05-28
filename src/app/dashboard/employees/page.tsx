"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/lib/permissions";
import type { TokenPayload } from "@/lib/auth";

interface Employee {
  id: string;
  companyId: string | null;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  position: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  code: string;
}

interface EmployeeFormState {
  companyId: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  position: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: EmployeeFormState = {
  companyId: "",
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  position: "",
  notes: "",
  isActive: true,
};

function toForm(employee: Employee): EmployeeFormState {
  return {
    companyId: employee.companyId || "",
    code: employee.code,
    name: employee.name,
    phone: employee.phone || "",
    email: employee.email || "",
    address: employee.address || "",
    position: employee.position || "",
    notes: employee.notes || "",
    isActive: employee.isActive,
  };
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "فشل تحميل بيانات الجلسة");
        setUser(d.data);
        setForm((prev) => ({
          ...prev,
          companyId:
            typeof d.data.companyId === "string" ? d.data.companyId : "",
        }));
      })
      .catch((err) => {
        setAuthError(
          err instanceof Error ? err.message : "تعذر تحميل بيانات الجلسة",
        );
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const permissions = user?.permissions || [];
  const canView = permissions.includes(PERMISSIONS.EMPLOYEES_VIEW);
  const canCreate = permissions.includes(PERMISSIONS.EMPLOYEES_CREATE);
  const canEdit = permissions.includes(PERMISSIONS.EMPLOYEES_EDIT);
  const canDelete = permissions.includes(PERMISSIONS.EMPLOYEES_DELETE);
  const userCompanyId =
    typeof user?.companyId === "string" ? user.companyId : "";

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-for-employees"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/companies");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الشركات");
      return json.data as Company[];
    },
  });

  const companyId = form.companyId || userCompanyId;

  const {
    data: employees = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employees", userCompanyId || "all"],
    enabled: !!user && canView,
    queryFn: async () => {
      const params = userCompanyId ? `?companyId=${userCompanyId}` : "";
      const res = await fetch(`/api/employees${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الموظفين");
      return json.data as Employee[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("الشركة مطلوبة");
      if (!form.code.trim() || !form.name.trim()) {
        throw new Error("كود الموظف والاسم مطلوبان");
      }

      const body = {
        companyId,
        code: form.code.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        position: form.position.trim() || null,
        notes: form.notes.trim() || null,
        isActive: form.isActive,
      };

      const res = await fetch(
        editingEmployee
          ? `/api/employees/${editingEmployee.id}`
          : "/api/employees",
        {
          method: editingEmployee ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حفظ الموظف");
      return json.data as Employee;
    },
    onSuccess: () => {
      toast(
        editingEmployee ? "تم تحديث الموظف بنجاح" : "تم إنشاء الموظف بنجاح",
        "success",
      );
      setDialogOpen(false);
      setEditingEmployee(null);
      setForm({ ...emptyForm, companyId: userCompanyId });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف الموظف");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف الموظف بنجاح", "success");
      setDeleteEmployee(null);
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const filteredEmployees = useMemo(() => {
    const term = search.trim();
    if (!term) return employees;
    return employees.filter((employee) =>
      [
        employee.code,
        employee.name,
        employee.phone || "",
        employee.email || "",
        employee.position || "",
      ].some((value) => value.includes(term)),
    );
  }, [employees, search]);

  const columns: Column<Employee>[] = [
    { key: "code", header: "الكود", sortable: true, render: (e) => e.code },
    { key: "name", header: "الاسم", sortable: true, render: (e) => e.name },
    {
      key: "position",
      header: "المنصب",
      render: (e) => e.position || "غير محدد",
    },
    { key: "phone", header: "الهاتف", render: (e) => e.phone || "-" },
    { key: "email", header: "البريد", render: (e) => e.email || "-" },
    {
      key: "isActive",
      header: "الحالة",
      render: (e) => (
        <Badge variant={e.isActive ? "success" : "danger"}>
          {e.isActive ? "نشط" : "معطل"}
        </Badge>
      ),
    },
  ];

  const openCreateDialog = () => {
    setEditingEmployee(null);
    setForm({ ...emptyForm, companyId: userCompanyId });
    setDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setForm(toForm(employee));
    setDialogOpen(true);
  };

  if (isLoadingAuth) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {authError}
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        لا تملك صلاحية عرض الموظفين
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموظفون"
        description="إدارة ملفات الموظفين الأساسية بدون حضور أو رواتب"
        actionLabel={canCreate ? "موظف جديد" : undefined}
        onAction={canCreate ? openCreateDialog : undefined}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredEmployees}
            loading={isLoading}
            error={error instanceof Error ? error.message : null}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="بحث بالاسم أو الكود أو المنصب..."
            onEdit={canEdit ? openEditDialog : undefined}
            onDelete={canDelete ? setDeleteEmployee : undefined}
            editLabel="تعديل"
            deleteLabel="حذف"
          />
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingEmployee ? "تعديل موظف" : "إضافة موظف"}
        className="max-w-2xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>الشركة *</Label>
            <Select
              value={form.companyId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, companyId: e.target.value }))
              }
              disabled={!!user?.companyId}
              placeholder="اختر الشركة"
              options={companies.map((company) => ({
                value: company.id,
                label: company.name,
              }))}
            />
          </div>
          <div>
            <Label>الكود *</Label>
            <Input
              value={form.code}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, code: e.target.value }))
              }
              placeholder="EMP-001"
            />
          </div>
          <div>
            <Label>الاسم *</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="اسم الموظف"
            />
          </div>
          <div>
            <Label>المنصب</Label>
            <Input
              value={form.position}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, position: e.target.value }))
              }
              placeholder="محاسب، مندوب، أمين مخزن..."
            />
          </div>
          <div>
            <Label>الهاتف</Label>
            <Input
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="07..."
            />
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="employee@company.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>العنوان</Label>
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="العنوان"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="ملاحظات داخلية"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            موظف نشط
          </label>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteEmployee}
        onClose={() => setDeleteEmployee(null)}
        onConfirm={() =>
          deleteEmployee && deleteMutation.mutate(deleteEmployee)
        }
        title="حذف الموظف"
        message={`هل أنت متأكد من حذف الموظف ${deleteEmployee?.name || ""}؟`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
