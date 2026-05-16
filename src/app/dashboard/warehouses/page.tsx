"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Dialog } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { WarehouseForm } from "@/components/forms/warehouse-form"
import { useToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"

interface Warehouse {
  id: string
  name: string
  code: string
  address: string | null
  isActive: boolean
}

export default function WarehousesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Warehouse | null>(null)
  const [deleteItem, setDeleteItem] = useState<Warehouse | null>(null)
  const [toggleItem, setToggleItem] = useState<Warehouse | null>(null)

  const { data: warehouses = [], isLoading, error } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses")
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل تحميل المخازن")
      return json.data as Warehouse[]
    },
  })

  const filtered = warehouses.filter(
    (w) => w.name.includes(search) || w.code.includes(search)
  )

  const createMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل إنشاء المخزن")
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses"] }); toast("تم إنشاء المخزن بنجاح", "success"); setDialogOpen(false) },
    onError: (err: Error) => toast(err.message, "error"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل تحديث المخزن")
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses"] }); toast("تم تحديث المخزن بنجاح", "success"); setEditItem(null); setDialogOpen(false) },
    onError: (err: Error) => toast(err.message, "error"),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل تغيير الحالة")
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses"] }); toast("تم تغيير الحالة بنجاح", "success"); setToggleItem(null) },
    onError: (err: Error) => toast(err.message, "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل حذف المخزن")
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses"] }); toast("تم حذف المخزن بنجاح", "success"); setDeleteItem(null) },
    onError: (err: Error) => toast(err.message, "error"),
  })

  const openAdd = () => { setEditItem(null); setDialogOpen(true) }
  const openEdit = (item: Warehouse) => { setEditItem(item); setDialogOpen(true) }

  const handleSubmit = useCallback(async (data: unknown) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, data })
    else createMutation.mutate(data)
  }, [editItem, updateMutation, createMutation])

  return (
    <div className="space-y-6">
      <PageHeader title="المخازن" description="إدارة المخازن والمستودعات" actionLabel="مخزن جديد" onAction={openAdd} />

      <DataTable
        columns={[
          { key: "code", header: "الكود", render: (w: Warehouse) => <span className="font-mono text-xs text-gray-500">{w.code}</span>, sortable: true },
          { key: "name", header: "الاسم", render: (w: Warehouse) => <span className="font-medium">{w.name}</span>, sortable: true },
          { key: "address", header: "العنوان", render: (w: Warehouse) => <span className="text-gray-600">{w.address || "-"}</span> },
          { key: "isActive", header: "الحالة", render: (w: Warehouse) => <Badge variant={w.isActive ? "success" : "danger"}>{w.isActive ? "نشط" : "محذوف"}</Badge> },
        ]}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        search={search}
        onSearchChange={setSearch}
        onEdit={openEdit}
        onDelete={(item: Warehouse) => setDeleteItem(item)}
        onToggleStatus={(item: Warehouse) => setToggleItem(item)}
      />

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditItem(null) }} title={editItem ? "تعديل مخزن" : "إضافة مخزن جديد"}>
        <WarehouseForm
          defaultValues={editItem ? { name: editItem.name, code: editItem.code, address: editItem.address || "" } : undefined}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Dialog>

      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)} title="حذف مخزن" message={`هل أنت متأكد من حذف المخزن "${deleteItem?.name}"؟`} confirmLabel="حذف" loading={deleteMutation.isPending} />
      <ConfirmDialog open={!!toggleItem} onClose={() => setToggleItem(null)} onConfirm={() => toggleItem && toggleMutation.mutate({ id: toggleItem.id, isActive: !toggleItem.isActive })} title={toggleItem?.isActive ? "تعطيل مخزن" : "تفعيل مخزن"} message={`هل أنت متأكد من ${toggleItem?.isActive ? "تعطيل" : "تفعيل"} المخزن "${toggleItem?.name}"؟`} confirmLabel={toggleItem?.isActive ? "تعطيل" : "تفعيل"} loading={toggleMutation.isPending} />
    </div>
  )
}
