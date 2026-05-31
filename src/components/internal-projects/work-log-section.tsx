"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Loader2, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface WorkLog {
  id: string;
  userId: string;
  user: {
    name: string;
  };
  minutes: number;
  description: string | null;
  date: string;
  createdAt: string;
}

interface WorkLogSectionProps {
  projectId: string;
  taskId: string;
  canCreate: boolean;
}

export function WorkLogSection({
  projectId,
  taskId,
  canCreate,
}: WorkLogSectionProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [logDate, setLogDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/internal-projects/${projectId}/tasks/${taskId}/work-logs`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setWorkLogs(d.data as WorkLog[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, taskId]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const mins = parseInt(minutes, 10);
      if (!mins || mins <= 0) throw new Error("الدقائق مطلوبة ويجب أن تكون أكبر من 0");
      if (!logDate) throw new Error("التاريخ مطلوب");
      const res = await fetch(
        `/api/internal-projects/${projectId}/tasks/${taskId}/work-logs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            minutes: mins,
            description: description.trim() || null,
            date: logDate,
          }),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إضافة سجل العمل");
      return json.data;
    },
    onSuccess: (data: WorkLog) => {
      toast("تم إضافة سجل العمل بنجاح", "success");
      setWorkLogs((prev) => [data, ...prev]);
      setMinutes("");
      setDescription("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const totalMinutes = workLogs.reduce((sum, w) => sum + w.minutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workLogs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>
            المجموع: {hours > 0 ? `${hours} ساعة ` : ""}
            {remainingMinutes} دقيقة
          </span>
        </div>
      )}

      {workLogs.length === 0 && !showForm ? (
        <p className="text-sm text-gray-500">لا يوجد سجلات عمل</p>
      ) : (
        <div className="space-y-2">
          {workLogs.map((wl) => (
            <div
              key={wl.id}
              className="rounded-lg border border-border/50 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{wl.user.name}</span>
                  <span className="text-xs text-gray-400">
                    {formatDate(wl.date)}
                  </span>
                </div>
                <span className="text-sm font-medium text-primary">
                  {wl.minutes} د
                </span>
              </div>
              {wl.description && (
                <p className="mt-1 text-xs text-gray-500">{wl.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {canCreate && (
        <>
          {showForm ? (
            <div className="space-y-3 rounded-lg border border-border/50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الدقائق *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label>التاريخ *</Label>
                  <Input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف العمل المنجز"
                  className="min-h-[60px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => addMutation.mutate()}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
            >
              <Clock className="h-4 w-4" />
              تسجيل وقت
            </Button>
          )}
        </>
      )}
    </div>
  );
}
