"use client";
/**
 * Measures how long the learner actually uses the app (for the study-time chart on /hom-nay). Time counts only while the
 * page is visible AND there was a touch/click/key/scroll in the last minute, so leaving a tab open does not add up.
 * Seconds are saved in batches. Renders nothing.
 */
import { useEffect } from "react";
import { addStudySeconds } from "./store";

const TICK_MS = 5_000;
const IDLE_MS = 60_000;
const FLUSH_SECONDS = 30;

export function StudyTimer() {
  useEffect(() => {
    let last = Date.now();
    let pending = 0;
    const touch = () => {
      last = Date.now();
    };
    const flush = () => {
      if (pending > 0) addStudySeconds(pending);
      pending = 0;
    };
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart", "wheel"] as const;
    for (const e of events) window.addEventListener(e, touch, { passive: true });
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - last > IDLE_MS) return;
      pending += TICK_MS / 1000;
      if (pending >= FLUSH_SECONDS) flush();
    }, TICK_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else touch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(timer);
      for (const e of events) window.removeEventListener(e, touch);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);
  return null;
}
