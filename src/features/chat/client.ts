"use client";
/** Browser side of the AI conversation: one call to the `chat-ai` Edge Function (docs/ENGAGEMENT_AI_PLAN.md §2). */
import { supabase } from "@/features/account/account";
import type { ChatReply, ChatTurn } from "../../../supabase/functions/chat-ai/chat";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat-ai`;

export type { ChatReply, ChatTurn };
export type ChatAnswer = ChatReply & { model: string; left: number };

const MESSAGES: Record<string, string> = {
  sign_in_required: "Bạn cần đăng nhập để trò chuyện với AI.",
  not_allowed: "Tài khoản này chưa được bật hội thoại AI.",
  daily_limit: "Hôm nay đã hết lượt trò chuyện AI. Mai tiếp tục nhé!",
  model_busy: "AI miễn phí đang hết lượt theo phút. Thử lại sau ít phút.",
  not_configured: "Máy chủ AI chưa được cài khóa.",
  bad_request: "Yêu cầu không hợp lệ.",
};

export async function askAi(scenario: string, level: string, turns: ChatTurn[]): Promise<{ answer: ChatAnswer } | { error: string }> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: MESSAGES.sign_in_required! };
    const r = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: SUPABASE_KEY, authorization: `Bearer ${token}` },
      body: JSON.stringify({ scenario, level, turns }),
    });
    const body = (await r.json().catch(() => ({}))) as Partial<ChatAnswer> & { error?: string };
    if (!r.ok || !body.reply) {
      if (r.status === 404) return { error: "Máy chủ hội thoại AI chưa được triển khai." };
      return { error: MESSAGES[body.error ?? ""] ?? "AI chưa trả lời được. Thử lại sau." };
    }
    return { answer: body as ChatAnswer };
  } catch {
    return { error: "Không kết nối được máy chủ AI (kiểm tra mạng)." };
  }
}
