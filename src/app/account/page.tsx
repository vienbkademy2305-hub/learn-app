import type { Metadata } from "next";
import { AccountPanel } from "@/features/account/AccountPanel";

export const metadata: Metadata = { title: "Tài khoản" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-3xl font-bold text-stone-900">Tài khoản</h1>
      <AccountPanel />
    </div>
  );
}
