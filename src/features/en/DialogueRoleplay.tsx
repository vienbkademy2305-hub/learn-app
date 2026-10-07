"use client";
/** English role-play in the Luyện nói step: the shared component + saving each score to the English progress. */
import { DialogueRoleplay as Roleplay, type RoleLine } from "@/features/speaking/DialogueRoleplay";
import { saveSpeaking, speakKey, useEnProgress } from "./progress";

export type { RoleLine };

export function DialogueRoleplay({ slug, lines }: { slug: string; lines: RoleLine[] }) {
  const [, update] = useEnProgress();
  return <Roleplay lang="en" lines={lines} onScore={(l, score) => update(saveSpeaking(speakKey(slug, `rp|${l.text}`), score))} />;
}
