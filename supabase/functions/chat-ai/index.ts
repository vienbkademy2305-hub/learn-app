/**
 * Supabase Edge Function `chat-ai` (docs/ENGAGEMENT_AI_PLAN.md §2) — AI conversation partner, holds GEMINI_API_KEY.
 *
 *   POST /functions/v1/chat-ai  { scenario, level, turns: [{ role: "user" | "ai", text }] }
 *     → { reply, reply_vi, pinyin, feedback, suggestions, model, left }
 *
 * Same access rule as grade-writing: signed-in accounts listed in CHAT_ALLOWED_EMAILS (else GRADER_ALLOWED_EMAILS,
 * else TTS_ALLOWED_EMAILS). At most CHAT_DAILY_LIMIT AI replies per account per UTC day (default 80), counted in the
 * user's app_metadata so no table is needed. Nothing is stored: the browser keeps the conversation.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { GeminiError, DEFAULT_MODELS } from "../grade-writing/grader.ts";
import { chat, parseChatInput } from "./chat.ts";

const env = (k: string) => Deno.env.get(k);
const SUPABASE_URL = env("SUPABASE_URL")!;
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = env("GEMINI_API_KEY") ?? "";
const MODELS = (env("CHAT_MODELS") ?? ["gemini-flash-lite-latest", ...DEFAULT_MODELS].join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const DAILY_LIMIT = Number(env("CHAT_DAILY_LIMIT") ?? 80);
const ALLOWED = new Set(
  (env("CHAT_ALLOWED_EMAILS") ?? env("GRADER_ALLOWED_EMAILS") ?? env("TTS_ALLOWED_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
);
const ORIGINS = (env("GRADER_ALLOWED_ORIGINS") ?? env("TTS_ALLOWED_ORIGINS") ?? "https://vienbkademy2305-hub.github.io,http://localhost:3000").split(",").map((s) => s.trim());

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) ? origin : ORIGINS[0]!;
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
}

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" });
  try {
    if (!API_KEY) return json(req, 503, { error: "not_configured" });

    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authErr } = token ? await admin.auth.getUser(token) : { data: null, error: true };
    const user = authErr ? null : auth?.user;
    if (!user) return json(req, 401, { error: "sign_in_required" });
    if (!user.email || !ALLOWED.has(user.email.toLowerCase())) return json(req, 403, { error: "not_allowed" });

    const input = parseChatInput((await req.json().catch(() => ({}))) as Record<string, unknown>);
    if (!input) return json(req, 400, { error: "bad_request" });

    const today = new Date().toISOString().slice(0, 10);
    const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const used = meta.chat_day === today ? Number(meta.chat_count) || 0 : 0;
    if (used >= DAILY_LIMIT) return json(req, 429, { error: "daily_limit", limit: DAILY_LIMIT });

    const { result, model } = await chat(input, MODELS, API_KEY);
    // Count only answered turns. Best effort: a failed write must not lose the answer.
    await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, chat_day: today, chat_count: used + 1 } }).catch((e) => console.error(e));
    return json(req, 200, { ...result, model, left: Math.max(0, DAILY_LIMIT - used - 1) });
  } catch (e) {
    console.error(e);
    if (e instanceof GeminiError && e.status === 429) return json(req, 429, { error: "model_busy" });
    return json(req, 502, { error: "chat_failed", detail: String((e as Error).message ?? e).slice(0, 300) });
  }
});
