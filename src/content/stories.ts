/**
 * Server-side access to the detective stories (build time only): the YAML files in data/en/stories/ are read directly.
 * Invalid stories fail the build, so a broken story can never be published.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { validateStory, type Story } from "@/domain/story";

let cache: Story[] | undefined;

const LEVEL_ORDER = { A2: 0, B1: 1, B2: 2 } as const;

export function stories(): Story[] {
  if (!cache || process.env.NODE_ENV === "development") {
    const dir = path.join(process.cwd(), "data", "en", "stories");
    const list = readdirSync(dir)
      .filter((f) => f.endsWith(".yaml"))
      .sort()
      .map((f) => parse(readFileSync(path.join(dir, f), "utf8")) as Story);
    const errors = list.flatMap(validateStory);
    if (errors.length) throw new Error(`Invalid stories:\n${errors.join("\n")}`);
    cache = list.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.id.localeCompare(b.id));
  }
  return cache;
}

export const story = (id: string): Story | undefined => stories().find((s) => s.id === id);
