/**
 * Server-side access to the detective stories (build time only): the YAML files in data/en/stories/ and data/zh/stories/
 * are read directly. Chinese stories get their pinyin from the characters here, so only the hanzi are written by hand.
 * Invalid stories fail the build, so a broken story can never be published.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pinyin } from "pinyin-pro";
import { parse } from "yaml";
import { validateStory, type Story, type StoryLang } from "@/domain/story";

let cache: Story[] | undefined;

const LEVEL_ORDER = { A2: 0, B1: 1, B2: 2, HSK1: 0, HSK2: 1, HSK3: 2 } as const;

/** "你好，我是小明。" → "nǐ hǎo, wǒ shì xiǎo míng." (spaces between syllables, none before punctuation) */
export function toPinyin(text: string): string {
  // quotation marks only add stray spaces to the pinyin line, so they are dropped first
  const clean = text.replace(/[“”「」"‘’]/g, "");
  return pinyin(clean, { toneType: "symbol", nonZh: "consecutive" })
    .replace(/\s+([，。！？、；：,.!?;:])/g, "$1")
    .replace(/，/g, ",")
    .replace(/。/g, ".")
    .replace(/！/g, "!")
    .replace(/？/g, "?")
    .replace(/、/g, ",")
    .replace(/；/g, ";")
    .replace(/：/g, ":")
    .replace(/([,.!?;:])(?=\S)/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function withPinyin(s: Story): Story {
  return {
    ...s,
    clues: s.clues.map((c) => ({ ...c, pinyin: toPinyin(c.text) })),
    witnesses: s.witnesses.map((w) => ({
      ...w,
      name_pinyin: toPinyin(w.name),
      role_pinyin: toPinyin(w.role),
      segments: w.segments.map((g) => ({ ...g, pinyin: toPinyin(g.text) })),
    })),
    solution: { ...s.solution, confession_pinyin: toPinyin(s.solution.confession) },
  };
}

function load(lang: StoryLang): Story[] {
  const dir = path.join(process.cwd(), "data", lang, "stories");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => {
      const s = { ...(parse(readFileSync(path.join(dir, f), "utf8")) as Story), lang };
      return lang === "zh" ? withPinyin(s) : s;
    });
}

export function stories(): Story[] {
  if (!cache || process.env.NODE_ENV === "development") {
    const list = [...load("en"), ...load("zh")];
    const errors = list.flatMap(validateStory);
    const ids = list.map((s) => s.id);
    if (new Set(ids).size !== ids.length) errors.push("duplicate story id across languages");
    if (errors.length) throw new Error(`Invalid stories:\n${errors.join("\n")}`);
    cache = list.sort((a, b) => a.lang.localeCompare(b.lang) || LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.id.localeCompare(b.id));
  }
  return cache;
}

export const storiesOf = (lang: StoryLang): Story[] => stories().filter((s) => s.lang === lang);
export const story = (id: string): Story | undefined => stories().find((s) => s.id === id);
