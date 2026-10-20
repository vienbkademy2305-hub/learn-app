"use client";
import type { IpaDictionary } from "@/domain/pron-report";

let promise: Promise<IpaDictionary> | null = null;

/** word → IPA (public/assets/en-ipa.json), loaded once per page. */
export function loadIpa(): Promise<IpaDictionary> {
  promise ??= fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/en-ipa.json`)
    .then((r) => (r.ok ? (r.json() as Promise<IpaDictionary>) : {}))
    .catch(() => ({}));
  return promise;
}
