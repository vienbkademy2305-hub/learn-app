/**
 * "Âm của tôi" (docs/ELSA_PRONUNCIATION_PLAN.md §6): how well each English sound went in the learner's pronunciation checks,
 * plus minimal pairs (words that differ by one sound) to practise the weak ones. Pure.
 */
import { alignPhones, ipaPhones, type IpaDictionary, type Report } from "./pron-report";

export interface PhoneEntry {
  tries: number;
  right: number;
}
export interface PhoneStats {
  v: 1;
  phones: Record<string, PhoneEntry>;
}
export const EMPTY_PHONES: PhoneStats = Object.freeze({ v: 1, phones: {} }) as PhoneStats;

/** Sounds with fewer attempts than this are shown as "not enough data yet". */
export const MIN_TRIES = 3;

/**
 * Adds one report to the statistics. Words said right count every sound of their IPA as right (when the word is in the
 * dictionary); wrong words count their sound-by-sound result.
 */
export function recordReport(stats: PhoneStats, report: Report, dict: IpaDictionary = {}): PhoneStats {
  const phones = { ...stats.phones };
  const bump = (sound: string, ok: boolean) => {
    const e = phones[sound] ?? { tries: 0, right: 0 };
    phones[sound] = { tries: Math.min(e.tries + 1, 200), right: Math.min(e.right + (ok ? 1 : 0), 200) };
  };
  for (const w of report.words) {
    if (w.phones && w.phones.length) {
      for (const p of w.phones) if (p.expected && p.expected !== "∅") bump(p.expected, p.ok);
    } else if (w.status === "good") {
      const ipa = w.ipa ?? dict[w.word.toLowerCase().replace(/[^a-z'-]/g, "")];
      if (ipa) for (const s of ipaPhones(ipa)) bump(s, true);
    }
  }
  return { v: 1, phones };
}

export type Mastery = "new" | "weak" | "ok" | "strong";

/** weak < 60 %, ok < 85 %, strong from 85 %; "new" until MIN_TRIES attempts. */
export function masteryOf(e: PhoneEntry | undefined): Mastery {
  if (!e || e.tries < MIN_TRIES) return "new";
  const p = e.right / e.tries;
  return p >= 0.85 ? "strong" : p >= 0.6 ? "ok" : "weak";
}

export const percentOfPhone = (e: PhoneEntry | undefined) => (e && e.tries ? Math.round((e.right / e.tries) * 100) : null);

export function weakestPhones(stats: PhoneStats, n = 5): string[] {
  return Object.entries(stats.phones)
    .filter(([, e]) => e.tries >= MIN_TRIES && e.right / e.tries < 0.85)
    .sort((a, b) => a[1].right / a[1].tries - b[1].right / b[1].tries)
    .slice(0, n)
    .map(([s]) => s);
}

export function parsePhones(raw: unknown): PhoneStats {
  if (!raw || typeof raw !== "object") return EMPTY_PHONES;
  const r = raw as Partial<PhoneStats>;
  if (r.v !== 1 || !r.phones || typeof r.phones !== "object") return EMPTY_PHONES;
  const phones: Record<string, PhoneEntry> = {};
  for (const [k, v] of Object.entries(r.phones)) {
    if (v && typeof v.tries === "number" && typeof v.right === "number" && v.tries > 0 && v.right >= 0 && v.right <= v.tries) phones[k] = { tries: Math.round(v.tries), right: Math.round(v.right) };
  }
  return { v: 1, phones };
}

/* ---------- minimal pairs ---------- */

export interface MinimalPair {
  a: string;
  b: string;
  /** the two sounds that differ */
  soundA: string;
  soundB: string;
}

/** Pairs of words whose IPA differs by exactly one sound (a substitution), found in the dictionary. */
export function findMinimalPairs(dict: IpaDictionary): MinimalPair[] {
  const entries = Object.entries(dict).map(([word, ipa]) => ({ word, phones: ipaPhones(ipa) })).filter((e) => e.phones.length >= 2 && e.phones.length <= 7);
  // bucket by length, then compare inside a bucket (cheap enough for ~1000 words)
  const byLength = new Map<number, typeof entries>();
  for (const e of entries) byLength.set(e.phones.length, [...(byLength.get(e.phones.length) ?? []), e]);
  const out: MinimalPair[] = [];
  for (const group of byLength.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const x = group[i]!.phones;
        const y = group[j]!.phones;
        let diff = -1;
        let count = 0;
        for (let k = 0; k < x.length && count < 2; k++) if (x[k] !== y[k]) (diff = k), count++;
        if (count === 1) out.push({ a: group[i]!.word, b: group[j]!.word, soundA: x[diff]!, soundB: y[diff]! });
      }
    }
  }
  return out;
}

/** Up to n pairs that involve this sound, shortest words first (easier to say). */
export function pairsFor(pairs: MinimalPair[], sound: string, n = 6): MinimalPair[] {
  return pairs
    .filter((p) => p.soundA === sound || p.soundB === sound)
    .sort((p, q) => p.a.length + p.b.length - (q.a.length + q.b.length) || p.a.localeCompare(q.a))
    .slice(0, n);
}

/** For a wrong word, how its sounds line up with the word that was heard — used to learn which sounds were swapped. */
export function swappedSounds(expectedIpa: string, heardIpa: string): Array<{ expected: string; heard: string | null }> {
  return alignPhones(ipaPhones(expectedIpa), ipaPhones(heardIpa))
    .filter((p) => !p.ok)
    .map((p) => ({ expected: p.expected, heard: p.heard }));
}
