"use client";
import { BrowserVoicePicker } from "@/features/audio/BrowserVoicePicker";
import { VoicePicker } from "@/features/tts/VoicePicker";
import { speakEnglish } from "./speech";

const SAMPLE = "Good morning. In my view, better public transport is the most effective solution to traffic.";

/** English voice settings: the device's voices, plus the TTS service (renders nothing until it is deployed). */
export function EnVoicePicker() {
  return (
    <>
      <BrowserVoicePicker lang="en" sample={SAMPLE} speak={(t) => speakEnglish(t)} />
      <VoicePicker lang="en" sample={SAMPLE} speak={(t) => speakEnglish(t)} />
    </>
  );
}
