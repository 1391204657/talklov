/** Shared moderation types */

export type ModerationCategory =
  | "political"
  | "sexual"
  | "violence"
  | "hate"
  | "scam"
  | "other";

export type ModerationResult = {
  allowed: boolean;
  categories: ModerationCategory[];
  reason: string;
  /** keyword | openai_moderation | llm | skip */
  source: string;
};

export const MODERATION_USER_MESSAGE: Record<ModerationCategory, string> = {
  political: "内容涉及敏感政治话题，无法发送。",
  sexual: "内容含不当色情信息，无法发送。",
  violence: "内容含暴力或血腥信息，无法发送。",
  hate: "内容含仇恨或歧视言论，无法发送。",
  scam: "内容疑似诈骗相关，无法发送。",
  other: "内容未通过安全审核，无法发送。",
};

export function formatModerationBlock(result: ModerationResult): string {
  const cat = result.categories[0] || "other";
  return result.reason || MODERATION_USER_MESSAGE[cat] || MODERATION_USER_MESSAGE.other;
}
