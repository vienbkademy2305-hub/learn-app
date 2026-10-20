"use client";
/** "Nhắc học tự động" card on the Hôm nay page: Web Push to this device, skipped on days already studied. */
import { useEffect, useState } from "react";
import { ACCOUNTS_ENABLED, useAccount } from "@/features/account/account";
import { dateKey, studied } from "@/domain/activity";
import { disablePush, enablePush, pushEnabled, pushSupported } from "./push";
import { useActivity } from "./store";

export function PushPanel() {
  const account = useAccount();
  const [activity] = useActivity();
  const uid = account.status === "signed-in" ? account.uid : null;
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let live = true;
    if (uid) void pushEnabled(uid).then((v) => live && setOn(v));
    else setOn(false);
    return () => {
      live = false;
    };
  }, [uid]);

  if (!ACCOUNTS_ENABLED) return null;
  const today = dateKey();

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-stone-900">Nhắc học tự động</h2>
      <p className="mt-1 text-sm text-stone-600">
        Đến giờ đã chọn mà hôm nay bạn chưa học, app sẽ gửi thông báo về thiết bị này (cả khi đã đóng trang). Đã học rồi thì không làm phiền.
      </p>
      {!uid ? (
        <p className="mt-3 text-sm text-stone-500">Hãy đăng nhập tài khoản để bật nhắc tự động.</p>
      ) : !pushSupported() ? (
        <p className="mt-3 text-sm text-stone-500">Trình duyệt này chưa hỗ trợ thông báo. Trên iPhone: thêm app vào màn hình chính rồi mở từ đó.</p>
      ) : (
        <form
          className="mt-3 flex flex-wrap items-center gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const time = new FormData(e.currentTarget).get("time");
            if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) return;
            setBusy(true);
            const err = await enablePush(uid, time, studied(activity, today) ? today : null);
            setBusy(false);
            setOn(!err);
            setMsg(err ?? `Đã bật: nhắc lúc ${time} nếu hôm đó chưa học.`);
          }}
        >
          <label className="text-sm text-stone-700">
            Giờ nhắc{" "}
            <input type="time" name="time" required defaultValue={activity.reminder ?? "20:00"} className="rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button type="submit" disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            {on ? "Cập nhật giờ nhắc" : "Bật thông báo"}
          </button>
          {on && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await disablePush(uid);
                setBusy(false);
                setOn(false);
                setMsg("Đã tắt nhắc tự động.");
              }}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Tắt
            </button>
          )}
          {msg && <span className="text-xs text-stone-500" role="status">{msg}</span>}
        </form>
      )}
    </section>
  );
}
