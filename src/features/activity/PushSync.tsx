"use client";
/** Reports to the server that today counts as a study day, so the push reminder is skipped. Renders nothing. */
import { useEffect } from "react";
import { ACCOUNTS_ENABLED, useAccount } from "@/features/account/account";
import { dateKey, studied } from "@/domain/activity";
import { reportStudied } from "./push";
import { useActivity } from "./store";

let reported = "";

export function PushSync() {
  const account = useAccount();
  const [activity] = useActivity();
  const uid = account.status === "signed-in" ? account.uid : null;
  const today = dateKey();
  const didStudy = studied(activity, today);
  useEffect(() => {
    if (!ACCOUNTS_ENABLED || !uid || !didStudy) return;
    const marker = `${uid}:${today}`;
    if (reported === marker) return;
    reported = marker;
    void reportStudied(uid, today);
  }, [uid, didStudy, today]);
  return null;
}
