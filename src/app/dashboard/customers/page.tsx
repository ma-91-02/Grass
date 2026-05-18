"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustomerForm } from "@/components/forms/customer-form";
import { SupplierForm } from "@/components/forms/supplier-form";
import { CustomerCategoryForm } from "@/components/forms/customer-category-form";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { CUSTOMER_TYPE_LABELS, type CustomerType } from "@/types";
import { Edit, Ban, CheckCircle, Trash2, Plus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

type Tab = "customers" | "suppliers" | "categories";

interface Customer {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  governorate: string | null;
  customerType: CustomerType;
  customerCategoryId: string | null;
  customerCategoryName: string | null;
  isActive: boolean;
  notes: string | null;
  accounts: { id: string; currency: string; balance: number }[];
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  accounts: { id: string; currency: string; balance: number }[];
  createdAt: string;
}

interface CustomerCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  customerCount: number;
  createdAt: string;
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("customers");
  const [search, setSearch] = useState("");

  // Customer state
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [toggleCustomer, setToggleCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);

  // Supplier state
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [toggleSupplier, setToggleSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  // Category state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CustomerCategory | null>(
    null,
  );
  const [toggleCategory, setToggleCategory] = useState<CustomerCategory | null>(
    null,
  );
  const [deleteCategory, setDeleteCategory] = useState<CustomerCategory | null>(
    null,
  );

  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserPermissions(d.data?.permissions || []))
      .catch(() => {});
  }, []);

  // Queries
  const {
    data: customers = [],
    isLoading: customersLoading,
    error: customersError,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل العملاء");
      return json.data as Customer[];
    },
  });

  const {
    data: suppliers = [],
    isLoading: suppliersLoading,
    error: suppliersError,
  } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الموردين");
      return json.data as Supplier[];
    },
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["customer-categories"],
    queryFn: async () => {
      const res = await fetch("/api/customer-categories");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الأقسام");
      return json.data as CustomerCategory[];
    },
  });

  // Customer mutations
  const createCustomerMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء العميل");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast("تم إنشاء العميل بنجاح", "success");
      setCustomerDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث العميل");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast("تم تحديث العميل بنجاح", "success");
      setEditCustomer(null);
      setCustomerDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  // Supplier mutations
  const createSupplierMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء المورد");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast("تم إنشاء المورد بنجاح", "success");
      setSupplierDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث المورد");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast("تم تحديث المورد بنجاح", "success");
      setEditSupplier(null);
      setSupplierDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch("/api/customer-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء القسم");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-categories"] });
      toast("تم إنشاء القسم بنجاح", "success");
      setCategoryDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      const res = await fetch(`/api/customer-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث القسم");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-categories"] });
      toast("تم تحديث القسم بنجاح", "success");
      setEditCategory(null);
      setCategoryDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  // Toggle mutations
  const toggleCustomerMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تغيير الحالة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast("تم تغيير الحالة بنجاح", "success");
      setToggleCustomer(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const toggleSupplierMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تغيير الحالة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast("تم تغيير الحالة بنجاح", "success");
      setToggleSupplier(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/customer-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تغيير الحالة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-categories"] });
      toast("تم تغيير الحالة بنجاح", "success");
      setToggleCategory(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  // Delete mutations
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف العميل");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast("تم حذف العميل نهائياً", "success");
      setDeleteCustomer(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف المورد");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast("تم حذف المورد نهائياً", "success");
      setDeleteSupplier(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customer-categories/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف القسم");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-categories"] });
      toast("تم حذف القسم نهائياً", "success");
      setDeleteCategory(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  // Filters
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.includes(search) ||
      c.code.includes(search) ||
      c.phone?.includes(search) ||
      c.governorate?.includes(search) ||
      c.customerCategoryName?.includes(search) ||
      c.customerType.includes(search),
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.includes(search) ||
      s.code.includes(search) ||
      s.phone?.includes(search) ||
      s.address?.includes(search),
  );

  const filteredCategories = categories.filter((c) => c.name.includes(search));

  const tabs: { key: Tab; label: string }[] = [
    { key: "customers", label: "العملاء" },
    { key: "suppliers", label: "الموردون" },
    { key: "categories", label: "أقسام العملاء" },
  ];

  const tabLabels: Record<Tab, string> = {
    customers: "عميل جديد",
    suppliers: "مورد جديد",
    categories: "قسم جديد",
  };

  const canCreate = {
    customers: userPermissions.includes("customers.create"),
    suppliers: userPermissions.includes("suppliers.create"),
    categories: userPermissions.includes("customerCategories.create"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء والموردون"
        description="إدارة العملاء والموردين والأقسام"
      />

      <div className="flex items-center gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSearch("");
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-dark"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="mr-auto">
          {canCreate[tab] && (
            <Button
              size="sm"
              onClick={() => {
                if (tab === "customers") {
                  setEditCustomer(null);
                  setCustomerDialogOpen(true);
                } else if (tab === "suppliers") {
                  setEditSupplier(null);
                  setSupplierDialogOpen(true);
                } else {
                  setEditCategory(null);
                  setCategoryDialogOpen(true);
                }
              }}
            >
              <Plus className="h-4 w-4" />
              {tabLabels[tab]}
            </Button>
          )}
        </div>
      </div>

      {/* Customers Tab */}
      {tab === "customers" && (
        <>
          <DataTable
            columns={[
              {
                key: "code",
                header: "الكود",
                render: (c: Customer) => (
                  <span className="font-mono text-xs text-gray-500">
                    {c.code}
                  </span>
                ),
                sortable: true,
              },
              {
                key: "name",
                header: "الاسم",
                render: (c: Customer) => (
                  <span className="font-medium">{c.name}</span>
                ),
                sortable: true,
              },
              {
                key: "phone",
                header: "الهاتف",
                render: (c: Customer) => (
                  <span dir="ltr">{c.phone || "-"}</span>
                ),
              },
              {
                key: "customerType",
                header: "النوع",
                render: (c: Customer) => (
                  <Badge variant="info">
                    {CUSTOMER_TYPE_LABELS[c.customerType]}
                  </Badge>
                ),
              },
              {
                key: "governorate",
                header: "المحافظة",
                render: (c: Customer) => <span>{c.governorate || "-"}</span>,
              },
              {
                key: "customerCategoryName",
                header: "القسم",
                render: (c: Customer) => (
                  <span>{c.customerCategoryName || "-"}</span>
                ),
              },
              {
                key: "isActive",
                header: "الحالة",
                render: (c: Customer) => (
                  <Badge variant={c.isActive ? "success" : "danger"}>
                    {c.isActive ? "نشط" : "معطل"}
                  </Badge>
                ),
              },
            ]}
            data={filteredCustomers}
            loading={customersLoading}
            error={
              customersError instanceof Error ? customersError.message : null
            }
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="بحث بالاسم أو الكود أو الهاتف..."
            actions={(item: Customer) => (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => router.push(`/dashboard/customers/${item.id}`)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-primary"
                  title="عرض"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {userPermissions.includes("customers.edit") && (
                  <button
                    onClick={() => {
                      setEditCustomer(item);
                      setCustomerDialogOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                    title="تعديل"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {userPermissions.includes("customers.edit") && (
                  <button
                    onClick={() => setToggleCustomer(item)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-amber-600"
                    title={item.isActive ? "تعطيل" : "تفعيل"}
                  >
                    {item.isActive ? (
                      <Ban className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </button>
                )}
                {userPermissions.includes("customers.delete") && (
                  <button
                    onClick={() => setDeleteCustomer(item)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                    title="حذف نهائي"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          />

          <Dialog
            open={customerDialogOpen}
            onClose={() => {
              setCustomerDialogOpen(false);
              setEditCustomer(null);
            }}
            title={editCustomer ? "تعديل عميل" : "إضافة عميل جديد"}
            footer={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCustomerDialogOpen(false);
                    setEditCustomer(null);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  form="customer-form"
                  disabled={
                    createCustomerMutation.isPending ||
                    updateCustomerMutation.isPending
                  }
                >
                  {createCustomerMutation.isPending ||
                  updateCustomerMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ"}
                </Button>
              </>
            }
          >
            <CustomerForm
              defaultValues={
                editCustomer
                  ? {
                      name: editCustomer.name,
                      phone: editCustomer.phone || "",
                      whatsapp: editCustomer.whatsapp || "",
                      address: editCustomer.address || "",
                      governorate: editCustomer.governorate || "",
                      customerType: editCustomer.customerType,
                      customerCategoryId: editCustomer.customerCategoryId || "",
                      notes: editCustomer.notes || "",
                      openingBalanceIqd:
                        editCustomer.accounts.find((a) => a.currency === "IQD")
                          ?.balance || 0,
                      openingBalanceUsd:
                        editCustomer.accounts.find((a) => a.currency === "USD")
                          ?.balance || 0,
                    }
                  : undefined
              }
              onSubmit={async (data) => {
                if (editCustomer) {
                  updateCustomerMutation.mutate({ id: editCustomer.id, data });
                } else {
                  createCustomerMutation.mutate(data);
                }
              }}
              categories={categories}
            />
          </Dialog>

          <ConfirmDialog
            open={!!deleteCustomer}
            onClose={() => setDeleteCustomer(null)}
            onConfirm={() =>
              deleteCustomer && deleteCustomerMutation.mutate(deleteCustomer.id)
            }
            title="حذف عميل نهائياً"
            message={`هل أنت متأكد من حذف العميل "${deleteCustomer?.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
            confirmLabel="حذف نهائي"
            loading={deleteCustomerMutation.isPending}
          />
          <ConfirmDialog
            open={!!toggleCustomer}
            onClose={() => setToggleCustomer(null)}
            onConfirm={() =>
              toggleCustomer &&
              toggleCustomerMutation.mutate({
                id: toggleCustomer.id,
                isActive: !toggleCustomer.isActive,
              })
            }
            title={toggleCustomer?.isActive ? "تعطيل عميل" : "تفعيل عميل"}
            message={`هل أنت متأكد من ${toggleCustomer?.isActive ? "تعطيل" : "تفعيل"} العميل "${toggleCustomer?.name}"؟`}
            confirmLabel={toggleCustomer?.isActive ? "تعطيل" : "تفعيل"}
            loading={toggleCustomerMutation.isPending}
          />
        </>
      )}

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <>
          <DataTable
            columns={[
              {
                key: "code",
                header: "الكود",
                render: (s: Supplier) => (
                  <span className="font-mono text-xs text-gray-500">
                    {s.code}
                  </span>
                ),
                sortable: true,
              },
              {
                key: "name",
                header: "الاسم",
                render: (s: Supplier) => (
                  <span className="font-medium">{s.name}</span>
                ),
                sortable: true,
              },
              {
                key: "phone",
                header: "الهاتف",
                render: (s: Supplier) => (
                  <span dir="ltr">{s.phone || "-"}</span>
                ),
              },
              {
                key: "isActive",
                header: "الحالة",
                render: (s: Supplier) => (
                  <Badge variant={s.isActive ? "success" : "danger"}>
                    {s.isActive ? "نشط" : "معطل"}
                  </Badge>
                ),
              },
            ]}
            data={filteredSuppliers}
            loading={suppliersLoading}
            error={
              suppliersError instanceof Error ? suppliersError.message : null
            }
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="بحث بالاسم أو الكود أو الهاتف..."
            actions={(item: Supplier) => (
              <div className="flex items-center justify-center gap-1">
                {userPermissions.includes("suppliers.edit") && (
                  <button
                    onClick={() => {
                      setEditSupplier(item);
                      setSupplierDialogOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                    title="تعديل"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {userPermissions.includes("suppliers.edit") && (
                  <button
                    onClick={() => setToggleSupplier(item)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-amber-600"
                    title={item.isActive ? "تعطيل" : "تفعيل"}
                  >
                    {item.isActive ? (
                      <Ban className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </button>
                )}
                {userPermissions.includes("suppliers.delete") && (
                  <button
                    onClick={() => setDeleteSupplier(item)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                    title="حذف نهائي"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          />

          <Dialog
            open={supplierDialogOpen}
            onClose={() => {
              setSupplierDialogOpen(false);
              setEditSupplier(null);
            }}
            title={editSupplier ? "تعديل مورد" : "إضافة مورد جديد"}
            footer={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSupplierDialogOpen(false);
                    setEditSupplier(null);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  form="supplier-form"
                  disabled={
                    createSupplierMutation.isPending ||
                    updateSupplierMutation.isPending
                  }
                >
                  {createSupplierMutation.isPending ||
                  updateSupplierMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ"}
                </Button>
              </>
            }
          >
            <SupplierForm
              defaultValues={
                editSupplier
                  ? {
                      name: editSupplier.name,
                      phone: editSupplier.phone || "",
                      address: editSupplier.address || "",
                      notes: editSupplier.notes || "",
                      openingBalanceIqd:
                        editSupplier.accounts.find((a) => a.currency === "IQD")
                          ?.balance || 0,
                      openingBalanceUsd:
                        editSupplier.accounts.find((a) => a.currency === "USD")
                          ?.balance || 0,
                    }
                  : undefined
              }
              onSubmit={async (data) => {
                if (editSupplier) {
                  updateSupplierMutation.mutate({ id: editSupplier.id, data });
                } else {
                  createSupplierMutation.mutate(data);
                }
              }}
            />
          </Dialog>

          <ConfirmDialog
            open={!!deleteSupplier}
            onClose={() => setDeleteSupplier(null)}
            onConfirm={() =>
              deleteSupplier && deleteSupplierMutation.mutate(deleteSupplier.id)
            }
            title="حذف مورد نهائياً"
            message={`هل أنت متأكد من حذف المورد "${deleteSupplier?.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
            confirmLabel="حذف نهائي"
            loading={deleteSupplierMutation.isPending}
          />
          <ConfirmDialog
            open={!!toggleSupplier}
            onClose={() => setToggleSupplier(null)}
            onConfirm={() =>
              toggleSupplier &&
              toggleSupplierMutation.mutate({
                id: toggleSupplier.id,
                isActive: !toggleSupplier.isActive,
              })
            }
            title={toggleSupplier?.isActive ? "تعطيل مورد" : "تفعيل مورد"}
            message={`هل أنت متأكد من ${toggleSupplier?.isActive ? "تعطيل" : "تفعيل"} المورد "${toggleSupplier?.name}"؟`}
            confirmLabel={toggleSupplier?.isActive ? "تعطيل" : "تفعيل"}
            loading={toggleSupplierMutation.isPending}
          />
        </>
      )}

      {/* Categories Tab */}
      {tab === "categories" && (
        <>
          <DataTable
            columns={[
              {
                key: "name",
                header: "الاسم",
                render: (c: CustomerCategory) => (
                  <span className="font-medium">{c.name}</span>
                ),
                sortable: true,
              },
              {
                key: "description",
                header: "الوصف",
                render: (c: CustomerCategory) => (
                  <span className="text-gray-500">{c.description || "-"}</span>
                ),
              },
              {
                key: "customerCount",
                header: "عدد العملاء",
                render: (c: CustomerCategory) => <span>{c.customerCount}</span>,
              },
              {
                key: "isActive",
                header: "الحالة",
                render: (c: CustomerCategory) => (
                  <Badge variant={c.isActive ? "success" : "danger"}>
                    {c.isActive ? "نشط" : "معطل"}
                  </Badge>
                ),
              },
            ]}
            data={filteredCategories}
            loading={categoriesLoading}
            error={
              categoriesError instanceof Error ? categoriesError.message : null
            }
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="بحث بالاسم..."
            actions={(item: CustomerCategory) => (
              <div className="flex items-center justify-center gap-1">
                {userPermissions.includes("customerCategories.edit") && (
                  <button
                    onClick={() => {
                      setEditCategory(item);
                      setCategoryDialogOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                    title="تعديل"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {userPermissions.includes("customerCategories.edit") && (
                  <button
                    onClick={() => setToggleCategory(item)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-amber-600"
                    title={item.isActive ? "تعطيل" : "تفعيل"}
                  >
                    {item.isActive ? (
                      <Ban className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </button>
                )}
                {userPermissions.includes("customerCategories.delete") && (
                  <button
                    onClick={() => setDeleteCategory(item)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                    title="حذف نهائي"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          />

          <Dialog
            open={categoryDialogOpen}
            onClose={() => {
              setCategoryDialogOpen(false);
              setEditCategory(null);
            }}
            title={editCategory ? "تعديل قسم" : "إضافة قسم جديد"}
            footer={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCategoryDialogOpen(false);
                    setEditCategory(null);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  form="category-form"
                  disabled={
                    createCategoryMutation.isPending ||
                    updateCategoryMutation.isPending
                  }
                >
                  {createCategoryMutation.isPending ||
                  updateCategoryMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ"}
                </Button>
              </>
            }
          >
            <CustomerCategoryForm
              defaultValues={
                editCategory
                  ? {
                      name: editCategory.name,
                      description: editCategory.description || "",
                    }
                  : undefined
              }
              onSubmit={async (data) => {
                if (editCategory) {
                  updateCategoryMutation.mutate({ id: editCategory.id, data });
                } else {
                  createCategoryMutation.mutate(data);
                }
              }}
            />
          </Dialog>

          <ConfirmDialog
            open={!!deleteCategory}
            onClose={() => setDeleteCategory(null)}
            onConfirm={() =>
              deleteCategory && deleteCategoryMutation.mutate(deleteCategory.id)
            }
            title="حذف قسم نهائياً"
            message={`هل أنت متأكد من حذف القسم "${deleteCategory?.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
            confirmLabel="حذف نهائي"
            loading={deleteCategoryMutation.isPending}
          />
          <ConfirmDialog
            open={!!toggleCategory}
            onClose={() => setToggleCategory(null)}
            onConfirm={() =>
              toggleCategory &&
              toggleCategoryMutation.mutate({
                id: toggleCategory.id,
                isActive: !toggleCategory.isActive,
              })
            }
            title={toggleCategory?.isActive ? "تعطيل قسم" : "تفعيل قسم"}
            message={`هل أنت متأكد من ${toggleCategory?.isActive ? "تعطيل" : "تفعيل"} القسم "${toggleCategory?.name}"؟`}
            confirmLabel={toggleCategory?.isActive ? "تعطيل" : "تفعيل"}
            loading={toggleCategoryMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
