"use client";
import { useEffect } from "react";
import { startEnSync, useEnSyncStatus } from "./sync";

/** Mounted by the English layout: starts the account sync of the English progress. */
export function EnSyncStarter() {
  useEffect(() => startEnSync(), []);
  return null;
}

const TEXT: Record<string, string> = {
  off: "Tiến độ tiếng Anh lưu trên trình duyệt này.",
  guest: "Tiến độ tiếng Anh lưu trên trình duyệt này — đăng nhập để lưu theo tài khoản.",
  syncing: "Đang đồng bộ tiến độ tiếng Anh với tài khoản…",
  saved: "Tiến độ tiếng Anh đã đồng bộ với tài khoản.",
  error: "Chưa đồng bộ được tiến độ tiếng Anh (mất mạng?) — sẽ thử lại sau.",
  "no-table": "Tiến độ tiếng Anh đang lưu theo tài khoản trên trình duyệt này; máy chủ chưa bật đồng bộ tiếng Anh (cần chạy supabase/en-progress.sql).",
};

export function EnSyncNote() {
  const status = useEnSyncStatus();
  return <span>{TEXT[status]}</span>;
}
