"use client";
import { VoicePicker } from "@/features/tts/VoicePicker";
import { speakEnglish } from "./speech";

/** English voice settings (TTS service); renders nothing until the service is deployed. */
export function EnVoicePicker() {
  return <VoicePicker lang="en" sample="Good morning. In my view, better public transport is the most effective solution to traffic." speak={(t) => speakEnglish(t)} />;
}
