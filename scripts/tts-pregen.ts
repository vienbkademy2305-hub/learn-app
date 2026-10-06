/**
 * `pnpm tts:pregen --voice <id> [--second <id>] [--dry] [--lessons 1,2]` — creates, through the TTS service
 * (supabase/functions/tts), every English clip the app can play with this voice pair, so learners never wait
 * (docs/TTS_SERVICE_PLAN.md). Already-made clips cost nothing; the function stops at the monthly cap.
 *
 * Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, TTS_ADMIN_TOKEN
 * (the same value as the function secret).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { castSpeakers, splitDialogue } from "../src/domain/tts-cast";
import { normaliseTtsText, ttsKey, ttsPath } from "../src/features/tts/key";
import { DEFAULT_ROOT, loadEnglish } from "../importers/en/load";

const ROOT = path.resolve(import.meta.dirname, "..");
const env: Record<string, string> = {};
try {
  for (const line of readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local */
}
const get = (k: string) => process.env[k] ?? env[k] ?? "";
const URL_ = get("NEXT_PUBLIC_SUPABASE_URL");
const KEY = get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const TOKEN = get("TTS_ADMIN_TOKEN");

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dry = args.includes("--dry");
const main = arg("--voice");
const second = arg("--second") ?? "recorded";
const only = arg("--lessons") ? new Set(arg("--lessons")!.split(",").map(Number)) : null;
if (!main) throw new Error("usage: pnpm tts:pregen --voice google:en-GB-Neural2-C [--second google:en-GB-Neural2-B] [--dry]");
if (!URL_ || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing");

async function main_() {
  const info = (await (await fetch(`${URL_}/functions/v1/tts?langs=en`, { headers: { apikey: KEY } })).json()) as { voices: Array<{ id: string; gender: string }>; cap: number; used: number };
  const gender = (id: string) => info.voices.find((v) => v.id === id)?.gender;
  for (const v of [main!, second].filter((x) => x !== "recorded")) if (!gender(v)) throw new Error(`unknown voice ${v}`);

  // Same texts the browser asks for (src/features/en/speech.tsx): whole texts with the main voice, labelled dialogues turn by turn.
  const clips = new Map<string, { voice: string; text: string }>();
  const add = (voice: string, text: string) => {
    const t = normaliseTtsText(text);
    if (t) clips.set(`${voice}\n${t}`, { voice, text: t });
  };
  const say = (text: string) => add(main!, text);
  const listen = (text: string) => {
    const turns = splitDialogue(text);
    if (!turns) return say(text);
    const cast = castSpeakers(turns.map((t) => t.speaker), main!, second, gender);
    for (const t of turns) add(cast.get(t.speaker)!, t.text);
  };
  const data = loadEnglish(DEFAULT_ROOT) as any;
  const lexicon = new Map((data.lexicon as any[]).map((e) => [e.id, e]));
  const sentences = new Map((data.sentences as any[]).map((s) => [s.id, s]));
  const word = (e: any) => {
    say(e.headword);
    for (const c of e.collocations ?? []) say(c);
  };
  const exercises = (items: any[]) => {
    for (const x of items) {
      if (x.audio_text) listen(x.audio_text);
      if (x.kind === "dictation" && x.text) say(x.text);
    }
  };
  for (const l of data.lessons as any[]) {
    if (only && !only.has(l.number)) continue;
    for (const st of l.steps) {
      if (st.type === "vocabulary") for (const id of st.items) lexicon.get(id) && word(lexicon.get(id));
      if (st.type === "examples") for (const id of st.items) sentences.get(id) && say(sentences.get(id).text);
      if (st.type === "skill") for (const p of st.phrases ?? []) say(p.en);
      if (st.type === "dialogue") for (const ln of st.lines) say(ln.text);
      if (st.type === "exercises") exercises(st.items);
    }
  }
  if (!only) {
    for (const e of data.lexicon) word(e);
    for (const s of data.sentences) say(s.text);
    for (const t of data.tests ?? []) for (const sec of t.sections) exercises(sec.exercises);
  }

  // What is missing in Storage?
  const list = [...clips.values()];
  const missing: typeof list = [];
  for (let i = 0; i < list.length; i += 20)
    await Promise.all(
      list.slice(i, i + 20).map(async (c) => {
        const url = `${URL_}/storage/v1/object/public/tts/${ttsPath(await ttsKey(c.voice, c.text))}`;
        if (!(await fetch(url, { method: "HEAD" })).ok) missing.push(c);
      }),
    );
  const chars = missing.reduce((n, c) => n + c.text.length, 0);
  console.log(`${list.length} clips · ${missing.length} to create · ${chars.toLocaleString()} characters`);
  console.log(`this month: ${info.used.toLocaleString()} / ${info.cap.toLocaleString()} used`);
  if (info.used + chars > info.cap) console.log(`WARNING: only part of it fits under the cap; the service will stop at ${info.cap.toLocaleString()}.`);
  if (dry) return;
  if (!TOKEN) throw new Error("TTS_ADMIN_TOKEN missing in .env.local");

  let done = 0;
  let spent = 0;
  for (let i = 0; i < missing.length; i += 4) {
    const results = await Promise.all(
      missing.slice(i, i + 4).map(async (c) => {
        const r = await fetch(`${URL_}/functions/v1/tts`, {
          method: "POST",
          headers: { "content-type": "application/json", apikey: KEY, authorization: `Bearer ${TOKEN}` },
          body: JSON.stringify({ voice: c.voice, text: c.text }),
        });
        if (r.status === 429) return "cap" as const;
        if (!r.ok) throw new Error(`${r.status} ${await r.text()} — ${c.text.slice(0, 60)}`);
        spent += c.text.length;
        return "ok" as const;
      }),
    );
    done += results.filter((x) => x === "ok").length;
    if (results.includes("cap")) {
      console.log(`stopped: monthly cap reached after ${done} clips (${spent.toLocaleString()} characters). Run again next month.`);
      return;
    }
    if (done % 100 < 4) console.log(`${done}/${missing.length} · ${spent.toLocaleString()} characters`);
  }
  console.log(`done: ${done} clips, ${spent.toLocaleString()} characters`);
}

await main_();
