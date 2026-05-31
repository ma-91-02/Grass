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

interface Task {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  parentTaskId: string | null;
}

interface TaskFormData {
  code: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  parentTaskId: string;
}

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task?: Task | null;
  parentTasks?: Task[];
}

const emptyForm: TaskFormData = {
  code: "",
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
  parentTaskId: "",
};

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "منخفضة" },
  { value: "MEDIUM", label: "متوسطة" },
  { value: "HIGH", label: "عالية" },
  { value: "URGENT", label: "عاجلة" },
];

const STATUS_OPTIONS = [
  { value: "TODO", label: "للتنفيذ" },
  { value: "IN_PROGRESS", label: "قيد التنفيذ" },
  { value: "REVIEW", label: "مراجعة" },
  { value: "DONE", label: "منجز" },
  { value: "BLOCKED", label: "معطل" },
];

export function CreateTaskDialog({
  open,
  onClose,
  projectId,
  task,
  parentTasks = [],
}: CreateTaskDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<TaskFormData>(emptyForm);
  const isEditing = !!task;

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        code: task.code,
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
        parentTaskId: task.parentTaskId || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, task]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.code.trim() || !form.title.trim()) {
        throw new Error("الكود والعنوان مطلوبان");
      }
      const body: Record<string, unknown> = {
        code: form.code.trim(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        dueDate: form.dueDate || null,
        parentTaskId: form.parentTaskId || null,
      };
      if (isEditing) {
        body.status = task.status;
      }
      const url = isEditing
        ? `/api/internal-projects/${projectId}/tasks/${task.id}`
        : `/api/internal-projects/${projectId}/tasks`;
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حفظ المهمة");
      return json.data;
    },
    onSuccess: () => {
      toast(
        isEditing ? "تم تحديث المهمة بنجاح" : "تم إنشاء المهمة بنجاح",
        "success",
      );
      onClose();
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "تعديل المهمة" : "مهمة جديدة"}
      className="max-w-xl"
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
            placeholder="TSK-001"
          />
        </div>
        <div>
          <Label required>العنوان</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="عنوان المهمة"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>الوصف</Label>
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="وصف المهمة"
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
          <Label>تاريخ الاستحقاق</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, dueDate: e.target.value }))
            }
          />
        </div>
        {parentTasks.length > 0 && (
          <div className="sm:col-span-2">
            <Label>المهمة الأم</Label>
            <Select
              value={form.parentTaskId}
              onChange={(e) =>
                setForm((p) => ({ ...p, parentTaskId: e.target.value }))
              }
              options={parentTasks.map((t) => ({
                value: t.id,
                label: `${t.code} - ${t.title}`,
              }))}
              placeholder="بدون (مهمة رئيسية)"
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
