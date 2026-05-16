"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Dialog } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { CustomerForm } from "@/components/forms/customer-form"
import { useToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"
import { CUSTOMER_TYPE_LABELS, type CustomerType } from "@/types"
import { formatDate } from "@/lib/utils"

interface Customer {
  id: string
  name: string
  code: string
  phone: string | null
  customerType: CustomerType
  isActive: boolean
  creditLimit: number
  notes: string | null
  createdAt: string
}

export default function CustomersPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Customer | null>(null)
  const [deleteItem, setDeleteItem] = useState<Customer | null>(null)
  const [toggleItem, setToggleItem] = useState<Customer | null>(null)

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers")
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل تحميل العملاء")
      return json.data as Customer[]
    },
  })

  const filtered = customers.filter(
    (c) =>
      c.name.includes(search) ||
      c.code.includes(search) ||
      c.phone?.includes(search)
  )

  const createMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل إنشاء العميل")
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] })
      toast("تم إنشاء العميل بنجاح", "success")
      setDialogOpen(false)
    },
    onError: (err: Error) => toast(err.message, "error"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل تحديث العميل")
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] })
      toast("تم تحديث العميل بنجاح", "success")
      setEditItem(null)
      setDialogOpen(false)
    },
    onError: (err: Error) => toast(err.message, "error"),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل تغيير الحالة")
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] })
      toast("تم تغيير الحالة بنجاح", "success")
      setToggleItem(null)
    },
    onError: (err: Error) => toast(err.message, "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل حذف العميل")
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] })
      toast("تم حذف العميل بنجاح", "success")
      setDeleteItem(null)
    },
    onError: (err: Error) => toast(err.message, "error"),
  })

  const openAdd = () => {
    setEditItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: Customer) => {
    setEditItem(item)
    setDialogOpen(true)
  }

  const handleSubmit = useCallback(async (data: unknown) => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data })
    } else {
      createMutation.mutate(data)
    }
  }, [editItem, createMutation, updateMutation])

  return (
    <div className="space-y-6">
      <PageHeader
        title="العملاء"
        description="إدارة بيانات العملاء"
        actionLabel="عميل جديد"
        onAction={openAdd}
      />

      <DataTable
        columns={[
          { key: "code", header: "الكود", render: (c) => <span className="font-mono text-xs text-gray-500">{c.code}</span>, sortable: true },
          { key: "name", header: "الاسم", render: (c) => <span className="font-medium">{c.name}</span>, sortable: true },
          { key: "phone", header: "الهاتف", render: (c) => <span dir="ltr">{c.phone || "-"}</span> },
          { key: "customerType", header: "النوع", render: (c) => <Badge variant="info">{CUSTOMER_TYPE_LABELS[c.customerType]}</Badge> },
          { key: "isActive", header: "الحالة", render: (c) => <Badge variant={c.isActive ? "success" : "danger"}>{c.isActive ? "نشط" : "محذوف"}</Badge> },
          { key: "createdAt", header: "تاريخ الإضافة", render: (c) => <span className="text-gray-500">{formatDate(c.createdAt)}</span>, sortable: true },
        ]}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم أو الكود أو الهاتف..."
        onEdit={openEdit}
        onDelete={(item) => setDeleteItem(item)}
        onToggleStatus={(item) => setToggleItem(item)}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null) }}
        title={editItem ? "تعديل عميل" : "إضافة عميل جديد"}
      >
        <CustomerForm
          defaultValues={editItem ? {
            name: editItem.name,
            phone: editItem.phone || "",
            customerType: editItem.customerType,
            creditLimit: editItem.creditLimit,
            notes: editItem.notes || "",
          } : undefined}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="حذف عميل"
        message={`هل أنت متأكد من حذف العميل "${deleteItem?.name}"؟`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!toggleItem}
        onClose={() => setToggleItem(null)}
        onConfirm={() => toggleItem && toggleMutation.mutate({ id: toggleItem.id, isActive: !toggleItem.isActive })}
        title={toggleItem?.isActive ? "تعطيل عميل" : "تفعيل عميل"}
        message={`هل أنت متأكد من ${toggleItem?.isActive ? "تعطيل" : "تفعيل"} العميل "${toggleItem?.name}"؟`}
        confirmLabel={toggleItem?.isActive ? "تعطيل" : "تفعيل"}
        loading={toggleMutation.isPending}
      />
    </div>
  )
}
