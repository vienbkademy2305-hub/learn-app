"use client";
/**
 * Browser side of the writing grader (docs/EN_WRITING_GRADER_PLAN.md): send a homework to the `grade-writing`
 * Edge Function and read the account's past gradings (table `writing_grades`, RLS: own rows only).
 */
import { supabase } from "@/features/account/account";
import type { GradeInput, GradeResult } from "../../../supabase/functions/grade-writing/grader";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/grade-writing`;

export type GradeRequest = GradeInput & { slug: string };
export interface WritingGrade {
  id: string;
  created_at: string;
  model: string;
  text: string;
  result: GradeResult;
}

const MESSAGES: Record<string, string> = {
  sign_in_required: "Bạn cần đăng nhập để chấm bài.",
  not_allowed: "Tài khoản này chưa được bật chấm bài tự động.",
  daily_limit: "Hôm nay đã chấm đủ số bài cho phép. Mai chấm tiếp nhé.",
  model_busy: "Gói miễn phí của AI đang hết lượt (giới hạn theo phút/ngày). Thử lại sau ít phút.",
  not_configured: "Máy chủ chấm bài chưa được cài khóa AI.",
  text_too_long: "Bài quá dài để chấm.",
  bad_request: "Thiếu đề bài hoặc bài làm.",
};

export async function gradeHomework(req: GradeRequest): Promise<{ grade: WritingGrade } | { error: string }> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: MESSAGES.sign_in_required! };
    const r = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: SUPABASE_KEY, authorization: `Bearer ${token}` },
      body: JSON.stringify(req),
    });
    const body = (await r.json().catch(() => ({}))) as Partial<WritingGrade> & { error?: string };
    if (!r.ok || !body.result) {
      if (r.status === 404) return { error: "Máy chủ chấm bài chưa được triển khai." };
      return { error: MESSAGES[body.error ?? ""] ?? "Chấm bài không thành công. Thử lại sau." };
    }
    return { grade: { id: body.id!, created_at: body.created_at!, model: body.model!, text: req.text, result: body.result } };
  } catch {
    return { error: "Không kết nối được máy chủ chấm bài (kiểm tra mạng)." };
  }
}

/** Past gradings of one lesson, newest first (empty when the table is not set up yet). */
export async function loadGrades(slug: string, limit = 10): Promise<WritingGrade[]> {
  const { data, error } = await supabase()
    .from("writing_grades")
    .select("id, created_at, model, text, result")
    .eq("lesson", slug)
    .order("created_at", { ascending: false })
    .limit(limit);
  return error ? [] : ((data ?? []) as WritingGrade[]);
}
