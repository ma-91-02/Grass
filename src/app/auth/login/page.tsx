import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول - GRASS ERP",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-warm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">GRASS ERP</h1>
          <p className="mt-2 text-sm text-gray-500">شركة خبراء الشرق الأوسط</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
