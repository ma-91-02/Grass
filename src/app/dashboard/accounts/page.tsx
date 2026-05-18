"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronLeft,
  Search,
  FolderTree,
  FileText,
  Ban,
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
}

interface AccountNode extends Account {
  children: AccountNode[];
}

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

function TreeNode({
  node,
  depth,
  search,
}: {
  node: AccountNode;
  depth: number;
  search: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  if (
    search &&
    !node.code.includes(search) &&
    !node.name.includes(search)
  ) {
    const matchInChildren = node.children.some(
      (c) =>
        c.code.includes(search) || c.name.includes(search),
    );
    if (!matchInChildren) return null;
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 ${
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

        {node.isPosting && (
          <Badge variant="info">ترحيل</Badge>
        )}

        {hasChildren && !node.isPosting && (
          <Badge variant="warning">تجميعي</Badge>
        )}

        {!node.isActive && (
          <Badge variant="danger">
            <Ban className="ml-1 h-3 w-3" />
            غير نشط
          </Badge>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              search={search}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

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
      <PageHeader title="الحسابات" description="شجرة الحسابات" />

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
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
