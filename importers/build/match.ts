/**
 * Chooses which word a (surface, pinyin) pair from a source refers to
 * (docs/DATA_MAPPING.md §3.3). Pure — candidates are passed in.
 */
import { numberedToMarked, pinyinCompare, pinyinToneless } from "../../src/domain/pinyin";

export interface WordCandidate {
  key: string;
  numbered: string;
  inCurriculum: boolean;
}

export type MatchResult =
  | { status: "matched" | "matched_toneless"; key: string }
  | { status: "unresolved"; reason: "no_candidates" | "no_pinyin_match" | "ambiguous"; candidates: string[] };

/** Prefer curriculum words, then lowercase (non proper-noun) readings. */
function pickPreferred(list: WordCandidate[]): WordCandidate | null {
  if (list.length === 1) return list[0]!;
  const curriculum = list.filter((c) => c.inCurriculum);
  if (curriculum.length === 1) return curriculum[0]!;
  const pool = curriculum.length > 1 ? curriculum : list;
  const lower = pool.filter((c) => !/^[A-Z]/.test(c.numbered));
  if (lower.length === 1) return lower[0]!;
  return null;
}

export function matchByPinyin(markedPinyin: string, candidates: WordCandidate[]): MatchResult {
  if (candidates.length === 0) return { status: "unresolved", reason: "no_candidates", candidates: [] };

  const target = pinyinCompare(markedPinyin);
  const exact = candidates.filter((c) => pinyinCompare(numberedToMarked(c.numbered)) === target);
  if (exact.length > 0) {
    const chosen = pickPreferred(exact);
    return chosen
      ? { status: "matched", key: chosen.key }
      : { status: "unresolved", reason: "ambiguous", candidates: exact.map((c) => c.key) };
  }

  const toneless = pinyinToneless(markedPinyin);
  const loose = candidates.filter((c) => pinyinToneless(numberedToMarked(c.numbered)) === toneless);
  if (loose.length > 0) {
    const chosen = pickPreferred(loose);
    return chosen
      ? { status: "matched_toneless", key: chosen.key }
      : { status: "unresolved", reason: "ambiguous", candidates: loose.map((c) => c.key) };
  }

  return { status: "unresolved", reason: "no_pinyin_match", candidates: candidates.map((c) => c.key) };
}
