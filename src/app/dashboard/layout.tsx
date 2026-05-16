"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import type { TokenPayload } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/auth/login");
          return;
        }
        const data = await res.json();
        setUser(data.data);
      } catch {
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-warm">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userRole = user.roles?.[0] || "مستخدم";

  return (
    <div className="flex h-screen overflow-hidden bg-warm">
      <Sidebar userName={user.name} userRole={userRole} />
      <main key={pathname} className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
