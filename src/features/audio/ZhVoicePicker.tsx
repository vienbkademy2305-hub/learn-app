"use client";
import { VoicePicker } from "@/features/tts/VoicePicker";
import { BrowserVoicePicker } from "./BrowserVoicePicker";
import { speakChinese } from "./speech";

const SAMPLE = "你好！我叫王明，我是越南人。很高兴认识你。";

/** Mandarin voice settings: the device's voices, plus the TTS service (renders nothing until it is deployed). */
export function ZhVoicePicker() {
  return (
    <>
      <BrowserVoicePicker lang="zh" sample={SAMPLE} speak={(t) => speakChinese(t, 0.9)} />
      <VoicePicker lang="zh" sample={SAMPLE} speak={(t) => speakChinese(t, 0.9)} />
    </>
  );
}
