/** Source catalog (docs/DATA_MAPPING.md §1). Written to content.sources on every import. */
import type { Manifest } from "./manifest";

export type SourceId =
  | "cvdict"
  | "unihan-kvietnamese"
  | "xue-hanzi-sinoviet-overrides"
  | "makemeahanzi"
  | "complete-hsk-vocabulary"
  | "hsk-sentences-audio"
  | "hsk-grammar-krmanik"
  | "hsk1-chinese-learning"
  | "editorial"
  | "derived";

export interface SourceInfo {
  id: SourceId;
  name: string;
  url: string;
  license: string;
  publishable: boolean;
  /** Manifest entry the files are read from, and which of its files belong to this source. */
  input?: { kind: "repos" | "downloads"; name: string; files: string[] };
  via?: string;
  notes?: string;
}

export const SOURCES: SourceInfo[] = [
  {
    id: "cvdict",
    name: "CVDICT — Chinese-Vietnamese dictionary",
    url: "https://github.com/ph0ngp/CVDICT",
    license: "CC-BY-SA-4.0",
    publishable: true,
    input: { kind: "repos", name: "xue-hanzi", files: ["src/data/CVDICT.u8"] },
    via: "xue-hanzi (verbatim copy, license header included)",
  },
  {
    id: "unihan-kvietnamese",
    name: "Unihan kVietnamese",
    url: "https://www.unicode.org/charts/unihan.html",
    license: "UNKNOWN (Unicode License expected; not verified against the original file)",
    publishable: true,
    input: { kind: "repos", name: "xue-hanzi", files: ["src/data/kVietnamese.json"] },
    via: "xue-hanzi (converted to JSON by xue-hanzi)",
  },
  {
    id: "xue-hanzi-sinoviet-overrides",
    name: "xue-hanzi Sino-Vietnamese overrides",
    url: "https://github.com/phucbm/xue-hanzi",
    license: "NONE (repository has no license)",
    publishable: false,
    input: { kind: "repos", name: "xue-hanzi", files: ["src/data/sinoViet-overrides.json"] },
  },
  {
    id: "makemeahanzi",
    name: "Make Me a Hanzi dictionary",
    url: "https://github.com/skishore/makemeahanzi",
    license: "UNKNOWN (not verified against the original repository)",
    publishable: true,
    input: { kind: "repos", name: "xue-hanzi", files: ["src/data/makemeahanzi-dictionary.txt"] },
    via: "xue-hanzi (vendored copy)",
  },
  {
    id: "complete-hsk-vocabulary",
    name: "complete-hsk-vocabulary (HSK 3.0 word lists)",
    url: "https://github.com/drkameleon/complete-hsk-vocabulary",
    license: "MIT",
    publishable: true,
    input: { kind: "downloads", name: "complete-hsk-vocabulary", files: [] },
  },
  {
    id: "hsk-sentences-audio",
    name: "hsk-sentences-audio",
    url: "https://github.com/no7z/hsk-sentences-audio",
    license: "CC-BY-SA-4.0 (data), MIT (code)",
    publishable: true,
    input: { kind: "repos", name: "hsk-sentences-audio", files: ["dist/sentences.json", "dist/review_flags.txt"] },
  },
  {
    id: "hsk-grammar-krmanik",
    name: "HSK 3.0 grammar points (GF0025-2021, digitized by krmanik/HSK-3.0)",
    url: "https://github.com/krmanik/HSK-3.0",
    license: "UNKNOWN (not credited in hsk-sentences-audio ATTRIBUTION.md)",
    publishable: false,
    input: { kind: "repos", name: "hsk-sentences-audio", files: ["data/grammar_points.json"] },
    via: "hsk-sentences-audio",
  },
  {
    id: "hsk1-chinese-learning",
    name: "hsk1-chinese-learning",
    url: "https://github.com/ALiangPang/hsk1-chinese-learning",
    license: "NONE (repository has no license)",
    // Shown in the app by the user's decision (2026-09-25) despite the missing
    // license — re-confirm before any public deployment (DATA_MAPPING.md §1).
    publishable: true,
    notes: "Displayed by user decision 2026-09-25; repository has no license.",
    input: { kind: "repos", name: "hsk1-chinese-learning", files: ["js/vocabulary.js", "js/sentences.js"] },
  },
  {
    id: "editorial",
    name: "chinese-app editorial content (data/editorial)",
    url: "https://github.com/vienbkademy2305-hub/learn-app/tree/master/data/editorial",
    license: "project",
    publishable: true,
    notes: "Vietnamese content written for this app; each row carries its own review status.",
  },
  {
    id: "derived",
    name: "Derived by chinese-app importers",
    url: "https://example.invalid/chinese-app",
    license: "project",
    publishable: true,
    notes: "Values computed from other sources (character HSK level, lesson drafts).",
  },
];

/** Version string + file hashes recorded in content.source_versions. */
export function sourceVersion(info: SourceInfo, manifest: Manifest): { version: string; files: Record<string, string> } {
  if (!info.input) return { version: "working-tree", files: {} };
  const pin = info.input.kind === "repos" ? manifest.repos[info.input.name] : manifest.downloads[info.input.name];
  if (!pin) throw new Error(`manifest has no ${info.input.kind}.${info.input.name}`);
  const names = info.input.files.length > 0 ? info.input.files : Object.keys(pin.files);
  const files = Object.fromEntries(names.map((f) => [f, pin.files[f] ?? ""]));
  return { version: `${info.input.name}@${pin.commit}`, files };
}
