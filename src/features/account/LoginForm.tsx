"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usernameError } from "@/domain/account";
import { signIn, useAccount } from "./account";

const input = "w-full rounded-xl px-4 py-2.5 text-lg ring-1 ring-inset ring-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-stone-50";

export function LoginForm() {
  const account = useAccount();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account.status === "signed-in") router.replace("/");
  }, [account.status, router]);

  if (account.status === "disabled") {
    return <p className="rounded-2xl bg-white p-6 text-center text-stone-500 shadow-sm">Trang web này chưa bật tài khoản. Tiến độ học được lưu trên trình duyệt.</p>;
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const bad = usernameError(username);
        if (bad) return setError(bad);
        if (!password) return setError("Nhập mật khẩu.");
        setBusy(true);
        setError(null);
        const failed = await signIn(username, password);
        setBusy(false);
        if (failed) setError(failed);
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-stone-700">Tên tài khoản</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={busy} autoComplete="username" autoCapitalize="off" spellCheck={false} autoFocus className={input} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-stone-700">Mật khẩu</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} autoComplete="current-password" className={input} />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {busy ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
      <p className="text-center text-sm text-stone-500">
        Chưa có tài khoản? Hãy nhờ quản trị viên tạo giúp. Bạn vẫn có thể{" "}
        <Link href="/" className="font-medium text-brand-700 hover:underline">
          học không cần đăng nhập
        </Link>{" "}
        — tiến độ khi đó chỉ lưu trên trình duyệt này.
      </p>
    </form>
  );
}
