"use client";
import { BrowserVoicePicker } from "./BrowserVoicePicker";
import { speakChinese } from "./speech";

/** Mandarin voice settings (device voices). */
export function ZhVoicePicker() {
  return <BrowserVoicePicker lang="zh" sample="你好！我叫王明，我是越南人。很高兴认识你。" speak={(t) => speakChinese(t, 0.9)} />;
}
