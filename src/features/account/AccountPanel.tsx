"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProgress } from "@/features/progress/store";
import { changePassword, signOut, useAccount } from "./account";
import { SYNC_LABEL } from "./AccountMenu";

const MIN_PASSWORD = 8;

export function AccountPanel() {
  const account = useAccount();
  const [progress] = useProgress();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account.status === "signed-out") router.replace("/login");
  }, [account.status, router]);

  if (account.status === "disabled") return <p className="rounded-2xl bg-white p-6 text-center text-stone-500 shadow-sm">Trang web này chưa bật tài khoản.</p>;
  if (account.status !== "signed-in") return <p className="text-stone-400">Đang tải…</p>;

  const completed = Object.values(progress.lessons).filter((l) => l.completedAt).length;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-500">Đang đăng nhập</p>
        <p className="text-2xl font-bold text-stone-900">{account.username}</p>
        <p className="mt-1 text-sm text-stone-600" aria-live="polite">
          {SYNC_LABEL[account.sync]}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-stone-50 p-3">
            <dt className="text-stone-500">Từ đã học</dt>
            <dd className="text-xl font-bold text-stone-900">{Object.keys(progress.learned).length}</dd>
          </div>
          <div className="rounded-xl bg-stone-50 p-3">
            <dt className="text-stone-500">Bài hoàn thành</dt>
            <dd className="text-xl font-bold text-stone-900">{completed}</dd>
          </div>
          <div className="rounded-xl bg-stone-50 p-3">
            <dt className="text-stone-500">Từ đã lưu</dt>
            <dd className="text-xl font-bold text-stone-900">{Object.keys(progress.saved ?? {}).length}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Tiếp tục học
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-100"
          >
            Đăng xuất
          </button>
        </div>
      </section>

      <form
        className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < MIN_PASSWORD) return setMsg({ ok: false, text: `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự.` });
          if (pw !== pw2) return setMsg({ ok: false, text: "Hai mật khẩu không khớp." });
          setBusy(true);
          const failed = await changePassword(pw);
          setBusy(false);
          setMsg(failed ? { ok: false, text: failed } : { ok: true, text: "Đã đổi mật khẩu." });
          if (!failed) {
            setPw("");
            setPw2("");
          }
        }}
      >
        <h2 className="font-semibold text-stone-900">Đổi mật khẩu</h2>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Mật khẩu mới" autoComplete="new-password" aria-label="Mật khẩu mới" className="w-full rounded-xl px-4 py-2.5 ring-1 ring-inset ring-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" aria-label="Nhập lại mật khẩu mới" className="w-full rounded-xl px-4 py-2.5 ring-1 ring-inset ring-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        {msg && <p className={`text-sm ${msg.ok ? "text-jade-700" : "text-brand-700"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60">
          Đổi mật khẩu
        </button>
      </form>
      <p className="text-xs text-stone-400">Tiến độ tự lưu vào tài khoản sau mỗi thay đổi, và được giữ bản sao trên trình duyệt này để học được cả khi mất mạng.</p>
    </div>
  );
}
