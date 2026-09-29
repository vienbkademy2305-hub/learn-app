"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LAST_LANG_KEY, type Lang } from "./SiteChrome";

const LABEL: Record<Lang, string> = { zh: "tiếng Trung", en: "tiếng Anh" };

/** "Tiếp tục học …" for the language studied last on this browser. */
export function ContinueLang() {
  const [last, setLast] = useState<Lang | null>(null);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(LAST_LANG_KEY);
      if (v === "zh" || v === "en") setLast(v);
    } catch {
      // storage blocked
    }
  }, []);
  if (!last) return null;
  return (
    <Link href={`/${last}`} className="mt-5 inline-block rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700">
      Tiếp tục học {LABEL[last]} →
    </Link>
  );
}
