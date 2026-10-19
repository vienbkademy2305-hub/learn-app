/** Server-side loader for the Chinese practice tests (data/zh-tests/*.json), read at build time. */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { itemCount, type ZhTest } from "@/domain/zh-test";

const DIR = path.resolve(process.cwd(), "data", "zh-tests");

let cache: ZhTest[] | null = null;
export function zhTests(): ZhTest[] {
  cache ??= readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as ZhTest);
  return cache;
}
export const zhTest = (id: string) => zhTests().find((t) => t.id === id);
export const zhTestCards = () =>
  zhTests().map((t) => ({ id: t.id, title: t.title_vi, level: t.level, minutes: t.minutes, pass: t.pass_percent, items: itemCount(t), status: t.status }));
