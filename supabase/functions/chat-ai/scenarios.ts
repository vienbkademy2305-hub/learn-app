/**
 * Conversation scenarios of the AI chat (docs/ENGAGEMENT_AI_PLAN.md §2). Pure TypeScript with no imports:
 * the Edge Function (Deno) picks the role prompt by id, the browser imports the list for its menu.
 */

export type ChatLang = "en" | "zh";

export interface Scenario {
  id: string;
  lang: ChatLang;
  icon: string;
  title_vi: string;
  /** one line shown on the card */
  blurb_vi: string;
  /** who the AI plays and what the learner has to do (English/Chinese is irrelevant: the system prompt is Vietnamese) */
  role: string;
  /** a good first line from the AI when the learner has not said anything yet */
  opening: string;
}

export const SCENARIOS: Scenario[] = [
  { id: "en-cafe", lang: "en", icon: "☕", title_vi: "Gọi đồ ở quán cà phê", blurb_vi: "Đặt đồ uống, hỏi giá, thanh toán.", role: "a friendly barista at a coffee shop. The learner is a customer ordering drinks and food, asking about sizes, prices, and paying.", opening: "Hi there! Welcome to Sunrise Coffee. What can I get for you today?" },
  { id: "en-intro", lang: "en", icon: "👋", title_vi: "Làm quen, tự giới thiệu", blurb_vi: "Gặp người mới: tên, quê, công việc, sở thích.", role: "a new friend the learner has just met at a language club. Chat naturally about names, hometown, family, work or study, and hobbies.", opening: "Hi! I'm Emma. I don't think we've met. What's your name?" },
  { id: "en-directions", lang: "en", icon: "🗺️", title_vi: "Hỏi đường", blurb_vi: "Hỏi và hiểu chỉ đường trong thành phố.", role: "a local person in a city centre. The learner is a tourist asking for directions to places (station, bank, museum, restaurant). Give short, clear directions.", opening: "Excuse me, you look a little lost. Can I help you find something?" },
  { id: "en-shopping", lang: "en", icon: "🛍️", title_vi: "Mua sắm quần áo", blurb_vi: "Hỏi size, màu, giá, thử đồ, trả giá.", role: "a shop assistant in a clothes shop. The learner wants to buy clothes: sizes, colours, prices, trying on, paying.", opening: "Good afternoon! Are you looking for anything in particular today?" },
  { id: "en-interview", lang: "en", icon: "💼", title_vi: "Phỏng vấn xin việc", blurb_vi: "Trả lời câu hỏi phỏng vấn cơ bản.", role: "a polite interviewer at a company interviewing the learner for an entry-level job. Ask typical questions one at a time (introduce yourself, strengths, experience, why this job), and follow up on the answers.", opening: "Good morning, and thanks for coming in. Could you start by telling me a little about yourself?" },
  { id: "en-ielts1", lang: "en", icon: "🎓", title_vi: "IELTS Speaking Part 1", blurb_vi: "Câu hỏi quen thuộc: bản thân, nhà cửa, công việc, sở thích.", role: "an IELTS Speaking examiner running Part 1. Ask short everyday questions on one familiar topic at a time (work or studies, hometown, home, hobbies, food, weather…), 3–4 questions per topic, then change topic. Stay neutral and brief like a real examiner; do not praise the answers inside your reply.", opening: "Good morning. My name is Anna. Can you tell me your full name, please?" },
  { id: "en-ielts2", lang: "en", icon: "🎤", title_vi: "IELTS Speaking Part 2 & 3", blurb_vi: "Nói dài một chủ đề rồi thảo luận sâu.", role: "an IELTS Speaking examiner. Give the learner one Part 2 cue card topic (describe a person/place/event… with 3–4 bullet points) and ask them to speak for 1–2 minutes (they will type or dictate it). After their answer, ask 2–3 related Part 3 discussion questions, one at a time, more abstract each time. Stay neutral like a real examiner.", opening: "Now I'm going to give you a topic. Describe a place you enjoy visiting in your free time. You should say: where it is, how often you go there, what you do there, and explain why you like it. Take a moment, then start whenever you're ready." },
  { id: "zh-intro", lang: "zh", icon: "👋", title_vi: "Làm quen, tự giới thiệu", blurb_vi: "Tên, quốc tịch, nghề nghiệp, sống ở đâu.", role: "một người bạn Trung Quốc vừa quen ở lớp học. Trò chuyện về tên, quốc tịch, nghề nghiệp/việc học, gia đình, nơi ở và sở thích.", opening: "你好！我叫王明。你叫什么名字？" },
  { id: "zh-food", lang: "zh", icon: "🍜", title_vi: "Gọi món ở nhà hàng", blurb_vi: "Gọi món, hỏi giá, thanh toán.", role: "một nhân viên phục vụ thân thiện ở nhà hàng Trung Quốc. Người học là khách gọi món ăn, đồ uống, hỏi giá và thanh toán.", opening: "欢迎光临！您几位？想吃点什么？" },
  { id: "zh-shop", lang: "zh", icon: "🛍️", title_vi: "Mua sắm, trả giá", blurb_vi: "Hỏi giá, hỏi size, màu sắc, mặc cả.", role: "một người bán hàng ở cửa hàng quần áo. Người học muốn mua đồ: hỏi giá, màu, cỡ, thử đồ, mặc cả và thanh toán.", opening: "你好，欢迎光临！您想买点什么？" },
  { id: "zh-directions", lang: "zh", icon: "🗺️", title_vi: "Hỏi đường, đi lại", blurb_vi: "Hỏi đường, đi tàu điện/taxi.", role: "một người dân địa phương ở Bắc Kinh. Người học là khách du lịch hỏi đường (ga tàu điện, ngân hàng, khách sạn, bệnh viện) hoặc cách đi taxi/tàu điện.", opening: "你好！需要帮忙吗？" },
  { id: "zh-weather", lang: "zh", icon: "⛅", title_vi: "Trò chuyện hằng ngày", blurb_vi: "Thời tiết, kế hoạch cuối tuần, thời gian.", role: "một người bạn Trung Quốc trò chuyện hằng ngày: thời tiết, hôm nay làm gì, kế hoạch cuối tuần, giờ giấc.", opening: "今天天气真好！你周末有什么打算？" },
];

export const LEVELS: Record<ChatLang, Array<{ id: string; label: string; hint: string; guide: string }>> = {
  en: [
    { id: "A2", label: "A2 — Cơ bản", hint: "Band ~4.0", guide: "CEFR A2: very short sentences, the 1000 most common words, present/past simple, speak slowly and clearly, no idioms." },
    { id: "B1", label: "B1 — Trung cấp", hint: "Band ~5.0", guide: "CEFR B1: simple connected sentences, common vocabulary, occasional phrasal verbs, no rare idioms." },
    { id: "B2", label: "B2 — Khá", hint: "Band ~6.0+", guide: "CEFR B2: natural fluent English with some idioms and varied grammar, still clear and not too fast." },
  ],
  zh: [
    { id: "HSK1", label: "HSK1", hint: "~300 từ", guide: "HSK1: dùng câu rất ngắn (3–8 chữ), chỉ từ vựng HSK1, không dùng cấu trúc phức." },
    { id: "HSK2", label: "HSK2", hint: "~500 từ", guide: "HSK2: câu ngắn, từ vựng HSK1–2, có thể dùng 了, 在, 比, 想, 要." },
    { id: "HSK3", label: "HSK3", hint: "~1000 từ", guide: "HSK3: câu dài hơn, từ vựng HSK1–3, có thể dùng 把, 被, 比, 因为…所以…, 虽然…但是…." },
  ],
};

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id);
export const scenariosOf = (lang: ChatLang) => SCENARIOS.filter((s) => s.lang === lang);
