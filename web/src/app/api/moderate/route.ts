import { NextRequest, NextResponse } from "next/server";
import { scanBlocklist } from "@/lib/moderation/blocklist";
import {
  MODERATION_USER_MESSAGE,
  type ModerationCategory,
  type ModerationResult,
} from "@/lib/moderation/types";
import { getSupabaseServer } from "@/lib/supabase/server";
import { clientIp, rateLimitAllow } from "@/lib/rateLimit";

/**
 * POST /api/moderate
 * Body: { text?: string, imageDataUrl?: string }
 * Requires signed-in session. Rate-limited per user (+ IP).
 *
 * Pipeline:
 *  1) Local blocklist (always)
 *  2) OpenAI Moderations API when AI_API_KEY + OpenAI-compatible host
 *  3) LLM JSON classifier fallback when key exists but moderations unavailable
 *  4) Images without AI key → cannot classify; text still checked
 */

const KEY = process.env.AI_API_KEY?.trim();
const BASE = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(
  /\/+$/,
  ""
);
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const MOD_MODEL = process.env.AI_MODERATION_MODEL || "omni-moderation-latest";

type Body = {
  text?: string;
  imageDataUrl?: string;
};

function deny(
  categories: ModerationCategory[],
  source: string,
  reason?: string
): ModerationResult {
  const cat = categories[0] || "other";
  return {
    allowed: false,
    categories,
    reason: reason || MODERATION_USER_MESSAGE[cat],
    source,
  };
}

function allow(source: string): ModerationResult {
  return { allowed: true, categories: [], reason: "", source };
}

function mapOpenAICategories(scores: Record<string, boolean>): ModerationCategory[] {
  const out = new Set<ModerationCategory>();
  if (scores["sexual"] || scores["sexual/minors"]) out.add("sexual");
  if (scores["violence"] || scores["violence/graphic"]) out.add("violence");
  if (scores["hate"] || scores["hate/threatening"]) out.add("hate");
  if (scores["harassment"] || scores["harassment/threatening"]) out.add("hate");
  // OpenAI has no "political" — political stays keyword/LLM only
  return [...out];
}

async function openaiModeration(
  text?: string,
  imageDataUrl?: string
): Promise<ModerationResult | null> {
  if (!KEY) return null;
  // Moderations endpoint is OpenAI-specific; skip for clearly non-OpenAI hosts
  const looksOpenAI =
    /openai\.com/i.test(BASE) ||
    process.env.AI_FORCE_OPENAI_MODERATION === "1";
  if (!looksOpenAI && !process.env.AI_FORCE_OPENAI_MODERATION) {
    return null;
  }

  const input: unknown[] = [];
  if (text?.trim()) {
    input.push({ type: "text", text: text.trim().slice(0, 8000) });
  }
  if (imageDataUrl?.startsWith("data:image")) {
    // Keep payload smaller for edge limits
    input.push({
      type: "image_url",
      image_url: { url: imageDataUrl.slice(0, 1_500_000) },
    });
  }
  if (!input.length) return allow("empty");

  try {
    const res = await fetch(`${BASE}/moderations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MOD_MODEL, input }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[moderate] openai moderations failed", res.status, errText.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as {
      results?: { flagged?: boolean; categories?: Record<string, boolean> }[];
    };
    const result = data.results?.[0];
    if (!result) return null;
    if (!result.flagged) return allow("openai_moderation");
    const cats = mapOpenAICategories(result.categories || {});
    return deny(cats.length ? cats : ["other"], "openai_moderation");
  } catch (e) {
    console.warn("[moderate] openai moderations error", e);
    return null;
  }
}

async function llmClassify(
  text?: string,
  imageDataUrl?: string
): Promise<ModerationResult | null> {
  if (!KEY) return null;

  const hasImage = !!imageDataUrl?.startsWith("data:image");
  const userContent: unknown[] = [
    {
      type: "text",
      text: `You are a safety classifier for a US-China language-exchange dating app.
Flag ONLY clear violations. Allow normal dating flirting, politics-as-news discussion, and mild romance.
Categories: political (calls for violence/separatism/overthrow), sexual (porn/explicit NSFW, especially minors), violence (graphic gore / how-to harm), hate, other.
Return JSON only: {"allowed":boolean,"categories":string[],"reason_zh":string}`,
    },
  ];
  if (text?.trim()) {
    userContent.push({
      type: "text",
      text: `Text:\n${text.trim().slice(0, 4000)}`,
    });
  }
  if (hasImage) {
    userContent.push({
      type: "image_url",
      image_url: { url: imageDataUrl!.slice(0, 1_200_000) },
    });
  }

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Safety classifier. Be precise; avoid false positives on normal chat.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("[moderate] llm classify failed", res.status);
      return null;
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: {
      allowed?: boolean;
      categories?: string[];
      reason_zh?: string;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (parsed.allowed === false) {
      const cats = (parsed.categories || [])
        .map((c) => c.toLowerCase())
        .filter((c): c is ModerationCategory =>
          ["political", "sexual", "violence", "hate", "scam", "other"].includes(
            c
          )
        );
      return deny(
        cats.length ? cats : ["other"],
        "llm",
        parsed.reason_zh
      );
    }
    return allow("llm");
  } catch (e) {
    console.warn("[moderate] llm classify error", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const sb = await getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ error: "后端未配置" }, { status: 503 });
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const ip = clientIp(req);
  const userLimit = rateLimitAllow(`mod:u:${user.id}`, 40, 60_000);
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试", allowed: true, source: "rate_limit" },
      {
        status: 429,
        headers: { "Retry-After": String(userLimit.retryAfterSec) },
      }
    );
  }
  const ipLimit = rateLimitAllow(`mod:ip:${ip}`, 80, 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试", allowed: true, source: "rate_limit" },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSec) },
      }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.slice(0, 8000) : undefined;
  const imageDataUrl =
    typeof body.imageDataUrl === "string"
      ? body.imageDataUrl.slice(0, 1_400_000)
      : undefined;

  if (!text?.trim() && !imageDataUrl) {
    return NextResponse.json(allow("empty"));
  }

  // 1) Local blocklist on text
  if (text?.trim()) {
    const hit = scanBlocklist(text);
    if (hit.hit) {
      return NextResponse.json(
        deny(hit.categories, "keyword")
      );
    }
  }

  // 2) OpenAI moderations
  const mod = await openaiModeration(text, imageDataUrl);
  if (mod) {
    if (!mod.allowed) return NextResponse.json(mod);
    // Moderations ran successfully and passed
    // Still run LLM for political nuance when text looks political-ish? Skip for speed.
    if (!text?.trim() || !needsPoliticalLlm(text)) {
      return NextResponse.json(mod);
    }
  }

  // 3) LLM fallback (political nuance + non-OpenAI providers + image when needed)
  const llm = await llmClassify(text, imageDataUrl);
  if (llm) return NextResponse.json(llm);

  // 4) No AI key / APIs failed
  if (imageDataUrl && !text?.trim() && !KEY) {
    return NextResponse.json(allow("skip_image_no_ai_key"));
  }

  return NextResponse.json(allow(mod?.source || "keyword_pass"));
}

function needsPoliticalLlm(text: string): boolean {
  return /政治|政府|选举|独立|革命|protest|election|president|xi\s*jinping|共产党|国民党/i.test(
    text
  );
}
