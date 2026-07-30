import type { ModerationCategory } from "./types";

/**
 * Lightweight first-pass blocklist (CN + EN).
 * Kept relatively specific to reduce false positives on normal chat.
 */
const RULES: { category: ModerationCategory; patterns: RegExp[] }[] = [
  {
    category: "sexual",
    patterns: [
      /儿童色情|幼女|恋童|童妓/i,
      /\b(child\s*porn|csam|pedophil)/i,
      /裸聊|约炮约炮|色情视频|黄片资源|无码AV|援交/i,
      /\b(onlyfans\s*leak|porn\s*hub|xxx\s*video)\b/i,
      /做爱细节|口交教程|射精|强奸幻想/i,
    ],
  },
  {
    category: "violence",
    patterns: [
      /杀人教程|如何杀死|肢解|斩首视频|血腥屠宰/i,
      /\b(how\s*to\s*kill|beheading\s*video|gore\s*porn)\b/i,
      /恐怖袭击制作|自制炸弹教程|枪支买卖/i,
      /\b(make\s*a\s*bomb|buy\s*illegal\s*gun)\b/i,
    ],
  },
  {
    category: "hate",
    patterns: [
      /种族灭绝|去死吧.*杂种|杀光.*人/i,
      /\b(kill\s*all\s*(jews|muslims|blacks|chinese))\b/i,
    ],
  },
  {
    category: "political",
    patterns: [
      // High-signal slogans / calls to action — not every mention of politics
      /推翻政府|武装暴动|颠覆国家政权/i,
      /台独建国|港独|疆独|藏独势力/i,
      /\b(overthrow\s*the\s*government|violent\s*revolution\s*now)\b/i,
      /六四坦克人纪念活动组织/i,
    ],
  },
];

export function scanBlocklist(text: string): {
  hit: boolean;
  categories: ModerationCategory[];
} {
  const raw = text.trim();
  if (!raw) return { hit: false, categories: [] };
  const cats = new Set<ModerationCategory>();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(raw))) cats.add(rule.category);
  }
  return { hit: cats.size > 0, categories: [...cats] };
}
