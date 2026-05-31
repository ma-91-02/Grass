"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

interface User {
  id: string;
  name: string;
}

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  managerUserId: string | null;
}

interface ProjectFormData {
  code: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  dueDate: string;
  managerUserId: string;
}

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}

const emptyForm: ProjectFormData = {
  code: "",
  name: "",
  description: "",
  status: "PLANNED",
  priority: "MEDIUM",
  startDate: "",
  dueDate: "",
  managerUserId: "",
};

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "مخطط" },
  { value: "ACTIVE", label: "نشط" },
  { value: "PAUSED", label: "متوقف" },
  { value: "COMPLETED", label: "مكتمل" },
  { value: "CANCELLED", label: "ملغي" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "منخفضة" },
  { value: "MEDIUM", label: "متوسطة" },
  { value: "HIGH", label: "عالية" },
  { value: "URGENT", label: "عاجلة" },
];

export function CreateProjectDialog({
  open,
  onClose,
  project,
}: CreateProjectDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const isEditing = !!project;

  useEffect(() => {
    if (!open) return;
    if (project) {
      setForm({
        code: project.code,
        name: project.name,
        description: project.description || "",
        status: project.status,
        priority: project.priority,
        startDate: project.startDate ? project.startDate.split("T")[0] : "",
        dueDate: project.dueDate ? project.dueDate.split("T")[0] : "",
        managerUserId: project.managerUserId || "",
      });
    } else {
      setForm(emptyForm);
    }
    setLoadingUsers(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setUsers(d.data as User[]);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [open, project]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.code.trim() || !form.name.trim()) {
        throw new Error("الكود والاسم مطلوبان");
      }
      const body = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        managerUserId: form.managerUserId || null,
      };
      const url = isEditing
        ? `/api/internal-projects/${project.id}`
        : "/api/internal-projects";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حفظ المشروع");
      return json.data;
    },
    onSuccess: () => {
      toast(
        isEditing ? "تم تحديث المشروع بنجاح" : "تم إنشاء المشروع بنجاح",
        "success",
      );
      onClose();
      qc.invalidateQueries({ queryKey: ["internal-projects"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "تعديل المشروع" : "مشروع جديد"}
      className="max-w-2xl"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
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
          <Label required>الكود</Label>
          <Input
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="PRJ-001"
          />
        </div>
        <div>
          <Label required>الاسم</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="اسم المشروع"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>الوصف</Label>
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="وصف المشروع"
          />
        </div>
        <div>
          <Label>الحالة</Label>
          <Select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            options={STATUS_OPTIONS}
          />
        </div>
        <div>
          <Label>الأولوية</Label>
          <Select
            value={form.priority}
            onChange={(e) =>
              setForm((p) => ({ ...p, priority: e.target.value }))
            }
            options={PRIORITY_OPTIONS}
          />
        </div>
        <div>
          <Label>تاريخ البداية</Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, startDate: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>تاريخ النهاية</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, dueDate: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>المدير المسؤول</Label>
          <Select
            value={form.managerUserId}
            onChange={(e) =>
              setForm((p) => ({ ...p, managerUserId: e.target.value }))
            }
            options={users.map((u) => ({ value: u.id, label: u.name }))}
            placeholder={loadingUsers ? "جاري التحميل..." : "اختر المستخدم"}
          />
        </div>
      </div>
    </Dialog>
  );
}
