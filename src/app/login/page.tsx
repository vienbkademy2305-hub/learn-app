import type { Metadata } from "next";
import { LoginForm } from "@/features/account/LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Đăng nhập</h1>
        <p className="mt-1 text-stone-500">Đăng nhập để lưu tiến độ học vào tài khoản và học tiếp trên máy khác.</p>
      </div>
      <LoginForm />
    </div>
  );
}
