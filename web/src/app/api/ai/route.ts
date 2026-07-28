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

type Action = "icebreakers" | "polish" | "translate";

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
      temperature: 0.8,
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
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
        suggestions = JSON.parse(content);
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
        return NextResponse.json({ ...JSON.parse(content), source: "llm" });
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
    return NextResponse.json({
      translation: fallbackTranslate(body.text || ""),
      source: "fallback-error",
    });
  }
}
