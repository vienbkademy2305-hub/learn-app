/** Text helpers shared by importers and the app. */
import { createHash } from "node:crypto";

const HAN = /\p{Script=Han}/u;
const NOT_CONTENT = /[\s\p{P}\p{S}]/gu;

export function isHan(char: string): boolean {
  return HAN.test(char);
}

/** Unique Han characters of a string, in order of first appearance. */
export function hanChars(text: string): string[] {
  return [...new Set([...text.normalize("NFC")].filter(isHan))];
}

/** Text used to detect duplicate sentences: NFC, no whitespace, no punctuation/symbols. */
export function sentenceContent(text: string): string {
  return text.normalize("NFC").replace(NOT_CONTENT, "");
}

export function sentenceHash(text: string): string {
  return createHash("sha1").update(sentenceContent(text)).digest("hex");
}

export function codepointId(char: string): string {
  return `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
}
