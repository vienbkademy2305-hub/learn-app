"use client";
import Link from "next/link";
import { useEffect } from "react";
import { startAccounts, useAccount, type SyncStatus } from "./account";

function UserIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 17.25C3 14.35 6.13 12 10 12s7 2.35 7 5.25a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: "Đang kết nối…",
  syncing: "Đang lưu…",
  saved: "Đã lưu vào tài khoản",
  error: "Chưa lưu được (mất mạng?) — sẽ thử lại",
};
const SYNC_DOT: Record<SyncStatus, string> = { idle: "bg-stone-300", syncing: "bg-amber-400", saved: "bg-jade-600", error: "bg-brand-600" };

/** Header entry: "Đăng nhập" when signed out, the username (with sync status) when signed in. Hidden when accounts are off. */
export function AccountMenu() {
  const account = useAccount();
  useEffect(() => startAccounts(), []);

  const base = "flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap hover:bg-stone-100 sm:px-3";
  if (account.status === "disabled") return null;
  if (account.status === "loading") return <span className={`${base} w-9 text-stone-300`} aria-hidden="true"><UserIcon /></span>;
  if (account.status === "signed-out") {
    return (
      <Link href="/login" className={`${base} text-brand-700`} aria-label="Đăng nhập">
        <UserIcon />
        <span className="hidden sm:inline">Đăng nhập</span>
      </Link>
    );
  }
  return (
    <Link href="/account" className={`${base} text-stone-700`} title={`${account.username} · ${SYNC_LABEL[account.sync]}`} aria-label={`Tài khoản ${account.username}`}>
      <span className="relative">
        <UserIcon className="size-5 text-brand-700" />
        <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white ${SYNC_DOT[account.sync]}`} />
      </span>
      <span className="hidden max-w-28 truncate sm:inline">{account.username}</span>
    </Link>
  );
}
