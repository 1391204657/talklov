import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side AI proxy. The API key NEVER reaches the browser.
 *
 * Configure via env (web/.env.local):
 *   AI_API_KEY   = your key
 *   AI_BASE_URL  = https://api.openai.com/v1   (default)
 *                  DeepSeek:  https://api.deepseek.com/v1
 *                  Qwen:      https://dashscope.aliyuncs.com/compatible-mode/v1
 *   AI_MODEL     = gpt-4o-mini | deepseek-chat | qwen-plus ...
 *
 * With no key set, it returns smart rule-based fallbacks so the demo still runs.
 */

type Action =
  | "icebreakers"
  | "polish"
  | "translate"
  | "dating_reply"
  | "dating_score"
  | "chat_reply";

interface DatingMessage {
  role: "ai" | "user";
  text: string;
}

interface Body {
  action: Action;
  text?: string;
  tone?: "friendly" | "polite" | "playful";
  profile?: {
    name?: string;
    interests?: string[];
    nativeLang?: string;
    learningLang?: string;
  };
  /** dating simulator */
  sceneId?: string;
  round?: number; // 1..3 after user reply
  history?: DatingMessage[];
  /** chat_reply: which AI persona (mei | jack) */
  persona?: string;
  /** chat_reply: recent messages [{role,text}] */
  chatHistory?: { role: "user" | "them"; text: string }[];
}

const KEY = process.env.AI_API_KEY;
const BASE = process.env.AI_BASE_URL || "https://api.openai.com/v1";
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

function systemPrompt(action: Action) {
  switch (action) {
    case "icebreakers":
      return "You help users on a US-China language-exchange app write friendly, respectful opening messages. Always return 3 short bilingual openers (Chinese + English), each under 25 words, based on the other person's interests. Be warm, never creepy. Return as a JSON array of strings.";
    case "polish":
      return "You are a bilingual writing assistant on a language-exchange app. Rewrite the user's draft message to be natural, warm and clear in BOTH Chinese and English. Keep the original meaning. Return JSON: {\"polished\": string, \"translation\": string}.";
    case "translate":
      return "You are a translator for a Chinese-English language-exchange app. Translate the message to the other language (Chinese<->English). Return only the translation text.";
    case "dating_reply":
      return `You roleplay Alex (28, US) on a first coffee date for a language-exchange app practice mode.
Stay in character: warm, playful, respectful English. 1-2 short spoken sentences only.
Never lecture. Never say you are an AI.
After the user's line, optionally add ONE brief tip line starting with "Tip:" suggesting a more natural phrasing (max 12 words).
Return JSON only: {"reply":"...","tip":"..."} (tip can be empty string).`;
    case "dating_score":
      return `You coach English dating small-talk for a US-China language app.
Given the transcript, score the USER only on real conversational replies (answering / asking back), NOT mere shadow-reading (echoing Alex's lines).
If the user mostly repeated Alex verbatim or near-verbatim, lower naturalness and vibe, set stars ≤ 3, and say so clearly in summary (Chinese) and tip.
Return JSON only:
{"naturalness":0-100,"politeness":0-100,"vibe":0-100,"stars":1-5,"summary":"one short Chinese sentence","bestLine":"best user English line that actually answers/asks (not an echo)","tip":"one short bilingual tip"}
Be encouraging but honest. Prefer stars 3-5 only for earnest non-echo attempts.`;
  }
}

async function callLLM(action: Action, userContent: string) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt(action) },
        { role: "user", content: userContent },
      ],
      temperature: action === "dating_score" ? 0.5 : 0.85,
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error("no json");
  }
}

// ---- Fallbacks (no key configured) ----
function fallbackIcebreakers(b: Body): string[] {
  const name = b.profile?.name?.split(" ")[0] || "你好";
  const interest = b.profile?.interests?.[0] || "旅行";
  const interest2 = b.profile?.interests?.[1] || "美食";
  return [
    `嗨${name}！我也很喜欢${interest} 😊 你平时都怎么玩？ / Hi! I love ${interest} too — how do you usually enjoy it?`,
    `看到你在学语言，我们可以互相帮忙～ / I saw you're learning a language, maybe we can help each other!`,
    `如果带朋友体验一次${interest2}，你会推荐什么？ / If you showed a friend ${interest2}, what would you pick?`,
  ];
}

function fallbackPolish(text: string) {
  const t = text.trim();
  return {
    polished: t ? `${t} 😊（我说得对吗？很高兴认识你！）` : "你好！很高兴认识你 😊",
    translation: t
      ? `${t} :) (Did I say that right? Nice to meet you!)`
      : "Hi! Nice to meet you :)",
  };
}

function fallbackTranslate(text: string) {
  const isCN = /[\u4e00-\u9fa5]/.test(text);
  return isCN
    ? `[EN] ${text}  (示例翻译，配置 AI_API_KEY 后为真实翻译)`
    : `[中] ${text}  (sample translation; set AI_API_KEY for real output)`;
}

const FALLBACK_REPLIES = [
  {
    reply: "Nice! I'm usually an oat latte person too. What else do you like doing on weekends?",
    tip: "Tip: Try “I'm usually an oat latte person.”",
  },
  {
    reply: "That sounds fun. I'd love to hear a favorite spot of yours around here.",
    tip: "Tip: “I'd love to hear your favorite spot.”",
  },
  {
    reply: "Haha fair. So… coffee refill, or shall we walk a bit after?",
    tip: "Tip: Keep it light — offer a next tiny step.",
  },
];

function fallbackDatingReply(round: number) {
  return FALLBACK_REPLIES[Math.min(Math.max(round, 1), 3) - 1];
}

// ---- Chat persona AI (美琪 & Jack) ----
function chatPersonaPrompt(persona: string): string {
  if (persona === "jack") {
    return `You are Jack, 29, from Austin TX. Software engineer learning Mandarin (HSK2). Your native language is English.
On TalkLov (a US-China language exchange & dating app).
Personality: chill, curious about Chinese culture, occasional humor. You sometimes try Mandarin phrases (with small mistakes) to practice.
Rules:
- Reply in 1-3 short sentences, mixing English naturally; throw in a Chinese word/phrase occasionally to practice.
- Be warm but not clingy. Ask questions about Chinese culture, slang, food, travel.
- If user writes Chinese, try to reply partly in Chinese (even imperfectly) and partly in English.
- Never say you are AI. You're a real person chatting on the app.
- Keep responses under 60 words.`;
  }
  return `You are 美琪 (Maggie), 24, from 成都 Chengdu. English beginner, native Mandarin speaker.
On TalkLov (a US-China language exchange & dating app).
Personality: warm, bubbly, curious about American life, a bit shy about English but trying hard. You love hotpot, cats, fitness, movies.
Rules:
- Reply in 1-3 short sentences, mostly in Chinese with some English words/phrases mixed in (to practice).
- Be enthusiastic but not over-the-top. Ask about American life, slang, dating culture.
- If user writes English, try to respond with some English (even if imperfect) plus Chinese.
- Never say you are AI. You're a real person chatting on the app.
- Keep responses under 60 words.`;
}

const FALLBACK_CHAT_MEI = [
  "哈哈 真的吗！那边的人平时都聊些什么呀？我好好奇～",
  "我英语不太好，但是我想试试！How do you say 火锅 in a cool way? 😂",
  "成都最近下雨好多，你那边天气怎么样呀？Do you like rainy days?",
  "你平时周末都做什么？I usually go to gym 然后吃顿好的 haha",
  "我最近在看一部美剧，好多俚语听不懂… Can you teach me some slang? 🙏",
];

const FALLBACK_CHAT_JACK = [
  "Haha nice. Hey do you know how to say 'no worries' in Chinese? 我想学一些日常的。",
  "That's cool! I've been trying to read menus in Chinese… 我每次都点错菜 lol",
  "Austin is super hot right now 🥵 成都的夏天也很热吗？",
  "I'm planning a trip to Chengdu next year. 你觉得我应该先去哪？Any must-see spots?",
  "Just finished coding for the day. 想练一下中文 — 你现在方便聊吗？",
];

function fallbackChatReply(persona: string, history: { role: string; text: string }[]): string {
  const pool = persona === "jack" ? FALLBACK_CHAT_JACK : FALLBACK_CHAT_MEI;
  const idx = history.length % pool.length;
  return pool[idx];
}

function fallbackDatingScore(history: DatingMessage[] = []) {
  const userLines = history.filter((h) => h.role === "user").map((h) => h.text.trim());
  const bestLine =
    userLines.sort((a, b) => b.length - a.length)[0] ||
    "I'd love an oat latte, less sweet.";
  const avgLen =
    userLines.reduce((s, t) => s + t.length, 0) / Math.max(userLines.length, 1);
  const naturalness = Math.min(92, 62 + Math.round(avgLen / 3));
  const politeness = 88;
  const vibe = 80;
  const stars = naturalness >= 85 ? 5 : naturalness >= 75 ? 4 : 3;
  return {
    naturalness,
    politeness,
    vibe,
    stars,
    summary: "表达自然度不错，语气礼貌，暧昧分寸也合适。",
    bestLine,
    tip: "More natural: keep answers short, then ask one curious question back.",
  };
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const usingLLM = Boolean(KEY);

  try {
    if (body.action === "icebreakers") {
      if (!usingLLM)
        return NextResponse.json({
          suggestions: fallbackIcebreakers(body),
          source: "fallback",
        });
      const content = await callLLM(
        "icebreakers",
        `Their profile: name=${body.profile?.name}, interests=${body.profile?.interests?.join(
          ", "
        )}, native=${body.profile?.nativeLang}, learning=${body.profile?.learningLang}.`
      );
      let suggestions: string[] = [];
      try {
        suggestions = extractJson(content) as string[];
      } catch {
        suggestions = content.split("\n").filter(Boolean).slice(0, 3);
      }
      return NextResponse.json({ suggestions, source: "llm" });
    }

    if (body.action === "polish") {
      if (!usingLLM)
        return NextResponse.json({
          ...fallbackPolish(body.text || ""),
          source: "fallback",
        });
      const content = await callLLM(
        "polish",
        `Tone: ${body.tone || "friendly"}. Draft: ${body.text}`
      );
      try {
        return NextResponse.json({
          ...(extractJson(content) as object),
          source: "llm",
        });
      } catch {
        return NextResponse.json({
          polished: content,
          translation: "",
          source: "llm",
        });
      }
    }

    if (body.action === "translate") {
      if (!usingLLM)
        return NextResponse.json({
          translation: fallbackTranslate(body.text || ""),
          source: "fallback",
        });
      const content = await callLLM("translate", body.text || "");
      return NextResponse.json({ translation: content, source: "llm" });
    }

    if (body.action === "dating_reply") {
      const round = body.round ?? 1;
      if (!usingLLM) {
        return NextResponse.json({
          ...fallbackDatingReply(round),
          source: "fallback",
        });
      }
      const transcript = (body.history || [])
        .map((m) => `${m.role === "ai" ? "Alex" : "User"}: ${m.text}`)
        .join("\n");
      const content = await callLLM(
        "dating_reply",
        `Scene: US first coffee date icebreaker. User just finished reply #${round} of 3.\nTranscript:\n${transcript}\nRespond as Alex.`
      );
      try {
        const parsed = extractJson(content) as { reply?: string; tip?: string };
        return NextResponse.json({
          reply: parsed.reply || String(content),
          tip: parsed.tip || "",
          source: "llm",
        });
      } catch {
        return NextResponse.json({
          reply: content.slice(0, 220),
          tip: "",
          source: "llm",
        });
      }
    }

    if (body.action === "dating_score") {
      if (!usingLLM) {
        return NextResponse.json({
          ...fallbackDatingScore(body.history),
          source: "fallback",
        });
      }
      const transcript = (body.history || [])
        .map((m) => `${m.role === "ai" ? "Alex" : "User"}: ${m.text}`)
        .join("\n");
      const content = await callLLM(
        "dating_score",
        `Score this practice transcript:\n${transcript}`
      );
      try {
        const parsed = extractJson(content) as Record<string, unknown>;
        return NextResponse.json({
          naturalness: Number(parsed.naturalness) || 75,
          politeness: Number(parsed.politeness) || 80,
          vibe: Number(parsed.vibe) || 75,
          stars: Math.min(5, Math.max(1, Number(parsed.stars) || 4)),
          summary: String(parsed.summary || "练得不错，继续保持短句提问。"),
          bestLine: String(parsed.bestLine || ""),
          tip: String(parsed.tip || ""),
          source: "llm",
        });
      } catch {
        return NextResponse.json({
          ...fallbackDatingScore(body.history),
          source: "fallback-parse",
        });
      }
    }

    if (body.action === "chat_reply") {
      const persona = body.persona || "mei";
      const history = body.chatHistory || [];
      if (!usingLLM) {
        return NextResponse.json({
          reply: fallbackChatReply(persona, history),
          source: "fallback",
        });
      }
      const sys = chatPersonaPrompt(persona);
      const msgs: { role: string; content: string }[] = [
        { role: "system", content: sys },
        ...history.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        })),
      ];
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KEY}`,
        },
        body: JSON.stringify({ model: MODEL, messages: msgs, temperature: 0.88 }),
      });
      if (!res.ok) throw new Error(`LLM ${res.status}`);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
      return NextResponse.json({ reply, source: "llm" });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    // Graceful degradation: fall back if the provider call fails.
    if (body.action === "icebreakers")
      return NextResponse.json({
        suggestions: fallbackIcebreakers(body),
        source: "fallback-error",
      });
    if (body.action === "polish")
      return NextResponse.json({
        ...fallbackPolish(body.text || ""),
        source: "fallback-error",
      });
    if (body.action === "dating_reply")
      return NextResponse.json({
        ...fallbackDatingReply(body.round ?? 1),
        source: "fallback-error",
      });
    if (body.action === "dating_score")
      return NextResponse.json({
        ...fallbackDatingScore(body.history),
        source: "fallback-error",
      });
    if (body.action === "chat_reply")
      return NextResponse.json({
        reply: fallbackChatReply(body.persona || "mei", body.chatHistory || []),
        source: "fallback-error",
      });
    return NextResponse.json({
      translation: fallbackTranslate(body.text || ""),
      source: "fallback-error",
    });
  }
}
