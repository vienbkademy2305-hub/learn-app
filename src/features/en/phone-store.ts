"use client";
/** Statistics per English sound (src/domain/phone-stats.ts), kept in this browser. */
import { useSyncExternalStore } from "react";
import type { Report } from "@/domain/pron-report";
import { EMPTY_PHONES, parsePhones, recordReport, type PhoneStats } from "@/domain/phone-stats";
import { loadIpa } from "./ipa";

const KEY = "learn-app:phones:v1";
const listeners = new Set<() => void>();
let current: PhoneStats | null = null;

function read(): PhoneStats {
  if (current) return current;
  try {
    current = parsePhones(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    current = EMPTY_PHONES;
  }
  return current;
}

function write(next: PhoneStats) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked: statistics live in memory for this tab
  }
  for (const l of listeners) l();
}

/** Adds the result of a pronunciation check to the statistics of each sound. */
export async function addReportToPhones(report: Report) {
  write(recordReport(read(), report, await loadIpa()));
}

export function usePhoneStats(): [PhoneStats, boolean] {
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      current = null;
      l();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };
  const state = useSyncExternalStore(subscribe, read, () => EMPTY_PHONES);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return [state, hydrated];
}
