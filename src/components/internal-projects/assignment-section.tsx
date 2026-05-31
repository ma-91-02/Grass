"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { X, UserPlus, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Assignment {
  id: string;
  userId: string;
  user: {
    name: string;
  };
  createdAt: string;
}

interface User {
  id: string;
  name: string;
}

interface AssignmentSectionProps {
  projectId: string;
  taskId: string;
  canCreate: boolean;
  canDelete: boolean;
}

export function AssignmentSection({
  projectId,
  taskId,
  canCreate,
  canDelete,
}: AssignmentSectionProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/internal-projects/${projectId}/tasks/${taskId}/assignments`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setAssignments(d.data as Assignment[]);
        }),
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setUsers(d.data as User[]);
        }),
    ]).finally(() => setLoading(false));
  }, [projectId, taskId]);

  const addMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(
        `/api/internal-projects/${projectId}/tasks/${taskId}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إضافة التعيين");
      return json.data;
    },
    onSuccess: (data: Assignment) => {
      toast("تم إضافة التعيين بنجاح", "success");
      setAssignments((prev) => [...prev, data]);
      setSelectedUserId("");
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(
        `/api/internal-projects/${projectId}/tasks/${taskId}/assignments/${assignmentId}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إزالة التعيين");
      return json.data;
    },
    onSuccess: (_data, assignmentId) => {
      toast("تم إزالة التعيين بنجاح", "success");
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const assignedUserIds = assignments.map((a) => a.userId);
  const availableUsers = users.filter(
    (u) => !assignedUserIds.includes(u.id),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">لا يوجد تعيينات</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium">{a.user.name}</span>
                <span className="mr-2 text-xs text-gray-400">
                  {formatDate(a.createdAt)}
                </span>
              </div>
              {canDelete && (
                <button
                  onClick={() => removeMutation.mutate(a.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  disabled={removeMutation.isPending}
                  title="إزالة"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canCreate && availableUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              options={availableUsers.map((u) => ({
                value: u.id,
                label: u.name,
              }))}
              placeholder="اختر مستخدم..."
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (selectedUserId) addMutation.mutate(selectedUserId);
            }}
            disabled={!selectedUserId || addMutation.isPending}
          >
            <UserPlus className="h-4 w-4" />
            إضافة
          </Button>
        </div>
      )}

      {canCreate && availableUsers.length === 0 && assignments.length > 0 && (
        <p className="text-xs text-gray-400">جميع المستخدمين مضافين</p>
      )}
    </div>
  );
}
