/**
 * Supabase Edge Function `tts` (docs/TTS_SERVICE_PLAN.md) — the only place that holds the TTS provider key.
 *
 *   GET  /functions/v1/tts?langs=en,cmn  → { provider, voices, cap, used }
 *   POST /functions/v1/tts  { text, voice } → { url, cached }   (url = public mp3 in the `tts` bucket)
 *
 * Cached clips are returned to anyone. Creating a new clip costs provider characters, so it needs a signed-in
 * account listed in TTS_ALLOWED_EMAILS (or TTS_ADMIN_TOKEN, used by the pre-generation script), and the
 * month's total must stay under TTS_MONTHLY_CHAR_CAP (default 950 000) — checked atomically in the database
 * BEFORE the provider is called (supabase/tts.sql: tts_reserve / tts_release).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { ttsKey, ttsPath, normaliseTtsText } from "./key.ts";
import { providerFromEnv, type Voice } from "./providers.ts";

const env = (k: string) => Deno.env.get(k);
const SUPABASE_URL = env("SUPABASE_URL")!;
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")!;
const CAP = Number(env("TTS_MONTHLY_CHAR_CAP") ?? 950_000);
const MAX_TEXT = 3000;
/** Long random secret for `pnpm tts:pregen` (deploy with --no-verify-jwt: this function checks auth itself). */
const ADMIN_TOKEN = env("TTS_ADMIN_TOKEN") ?? "";
const ALLOWED = new Set((env("TTS_ALLOWED_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
const ORIGINS = (env("TTS_ALLOWED_ORIGINS") ?? "https://vienbkademy2305-hub.github.io,http://localhost:3000").split(",").map((s) => s.trim());

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const provider = providerFromEnv(env);

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) ? origin : ORIGINS[0]!;
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "origin",
  };
}

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "content-type": "application/json" } });

const publicUrl = (key: string) => admin.storage.from("tts").getPublicUrl(ttsPath(key)).data.publicUrl;

async function usedThisMonth(): Promise<number> {
  const month = new Date().toISOString().slice(0, 7);
  const { data } = await admin.from("tts_usage").select("chars").eq("month", month).maybeSingle();
  return Number(data?.chars ?? 0);
}

/** May this request create new audio (spend provider characters)? */
async function mayCreate(req: Request): Promise<boolean> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (token === SERVICE_KEY || (ADMIN_TOKEN.length >= 32 && token === ADMIN_TOKEN)) return true;
  const { data, error } = await admin.auth.getUser(token);
  return !error && !!data.user?.email && ALLOWED.has(data.user.email.toLowerCase());
}

async function findVoice(id: string): Promise<Voice | undefined> {
  const lang = id.split(":")[1]?.split("-")[0] ?? "";
  return (await provider.voices([lang])).find((v) => v.id === id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    if (req.method === "GET") {
      const langs = (new URL(req.url).searchParams.get("langs") ?? "en").split(",").filter(Boolean);
      return json(req, 200, { provider: provider.name, voices: await provider.voices(langs), cap: CAP, used: await usedThisMonth() });
    }
    if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" });

    const body = (await req.json().catch(() => ({}))) as { text?: string; voice?: string };
    const text = normaliseTtsText(body.text ?? "");
    if (!text || !body.voice) return json(req, 400, { error: "text_and_voice_required" });
    if (text.length > MAX_TEXT) return json(req, 400, { error: "text_too_long", max: MAX_TEXT });
    const key = await ttsKey(body.voice, text);

    // 1. Already made → free for everyone.
    const { data: hit } = await admin.from("tts_clips").select("key").eq("key", key).maybeSingle();
    if (hit) return json(req, 200, { url: publicUrl(key), cached: true });

    // 2. New audio costs characters: only allowed accounts, only a known voice, only under the monthly cap.
    if (!(await mayCreate(req))) return json(req, 403, { error: "not_allowed" });
    const voice = await findVoice(body.voice);
    if (!voice) return json(req, 400, { error: "unknown_voice" });
    const { data: reserved, error: rErr } = await admin.rpc("tts_reserve", { p_chars: text.length, p_cap: CAP });
    if (rErr) throw rErr;
    if (!reserved) return json(req, 429, { error: "monthly_cap_reached", cap: CAP });

    let mp3: Uint8Array;
    try {
      mp3 = await provider.synthesize(text, voice);
    } catch (e) {
      await admin.rpc("tts_release", { p_chars: text.length });
      throw e;
    }
    const { error: upErr } = await admin.storage.from("tts").upload(ttsPath(key), mp3, { contentType: "audio/mpeg", upsert: true, cacheControl: "31536000" });
    if (upErr) throw upErr;
    await admin.from("tts_clips").upsert({ key, voice: voice.id, chars: text.length });
    return json(req, 200, { url: publicUrl(key), cached: false });
  } catch (e) {
    console.error(e);
    return json(req, 500, { error: "tts_failed", detail: String((e as Error).message ?? e).slice(0, 300) });
  }
});
