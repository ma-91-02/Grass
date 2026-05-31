"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "TODO", label: "للتنفيذ" },
  { value: "IN_PROGRESS", label: "قيد التنفيذ" },
  { value: "REVIEW", label: "مراجعة" },
  { value: "DONE", label: "منجز" },
  { value: "BLOCKED", label: "معطل" },
];

interface TaskStatusDropdownProps {
  projectId: string;
  taskId: string;
  currentStatus: string;
  disabled?: boolean;
}

export function TaskStatusDropdown({
  projectId,
  taskId,
  currentStatus,
  disabled,
}: TaskStatusDropdownProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(
        `/api/internal-projects/${projectId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث الحالة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم تحديث حالة المهمة", "success");
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  return (
    <Select
      value={currentStatus}
      onChange={(e) => updateMutation.mutate(e.target.value)}
      options={STATUS_OPTIONS}
      disabled={disabled || updateMutation.isPending}
    />
  );
}
