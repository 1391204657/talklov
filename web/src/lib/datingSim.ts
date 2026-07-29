/** US dating icebreaker simulator — scene 1 MVP. */

export const DATING_SCENE_ID = "us-dating-icebreak";

export const DATING_SCENE = {
  id: DATING_SCENE_ID,
  title: "美式约会破冰",
  subtitle: "第一次约会怎么打破尴尬？",
  badge: "场景 1",
  rounds: 3,
  persona:
    "Alex, 28, first coffee date in a US city. Warm, playful, respectful — never creepy.",
  opener:
    "Hey! I noticed you like coffee. What's your go-to order?",
} as const;

export type DatingTurn = {
  role: "ai" | "user";
  text: string;
};

export type DatingScore = {
  naturalness: number; // 0-100
  politeness: number;
  vibe: number; // flirt-appropriate
  stars: number; // 1-5 overall
  summary: string;
  bestLine: string;
  tip: string;
};

export const MOMENT_DRAFT_KEY = "talklov_moment_draft_v1";
export const MOMENT_TAG_KEY = "talklov_moment_tag_v1";
export const OPENER_DRAFT_KEY = "talklov_opener_draft_v1";
export const USER_MOMENTS_KEY = "talklov_user_moments_v1";
export const LEARN_RECORDS_KEY = "talklov_learn_records_v1";

export type LearnRecord = {
  id: string;
  sceneId: string;
  sceneTitle: string;
  completedAt: string; // ISO
  stars: number;
  naturalness: number;
  politeness: number;
  vibe: number;
  bestLine: string;
  summary: string;
};

export function loadLearnRecords(): LearnRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEARN_RECORDS_KEY);
    return raw ? (JSON.parse(raw) as LearnRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveLearnRecord(
  score: DatingScore,
  scene: { id: string; title: string } = DATING_SCENE
) {
  const rec: LearnRecord = {
    id: `lr-${Date.now()}`,
    sceneId: scene.id,
    sceneTitle: scene.title,
    completedAt: new Date().toISOString(),
    stars: score.stars,
    naturalness: score.naturalness,
    politeness: score.politeness,
    vibe: score.vibe,
    bestLine: score.bestLine,
    summary: score.summary,
  };
  const list = [rec, ...loadLearnRecords()].slice(0, 40);
  localStorage.setItem(LEARN_RECORDS_KEY, JSON.stringify(list));
  return rec;
}

export function formatLearnDate(iso: string, locale: "zh" | "en" = "zh"): string {
  try {
    const d = new Date(iso);
    if (locale === "en") {
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function buildShareMomentText(score: DatingScore): string {
  const line = score.bestLine.trim() || "…";
  return `刚刚和 AI 练了一轮「美式约会破冰」，AI 说我这句话用得很地道：「${line}」。美区的小伙伴们，真实约会中你们真的会这么说吗？求纠错～`;
}

export function buildShareOpenerText(score: DatingScore): string {
  const line = score.bestLine.trim() || "Hey!";
  return `刚用 AI 练了美式约会破冰，想拿这句跟你试试：\n「${line}」\n你觉得自然吗？也可以帮我纠一下 😊`;
}

export type UserMomentPost = {
  id: string;
  text: string;
  time: string;
  likes: number;
  comments: { by: string; text: string }[];
  corrections: { by: string; text: string }[];
  tag?: string;
  /** Duo Dub invite id for「合配」CTA on Moments. */
  duoInviteId?: string;
};

export function loadUserMoments(): UserMomentPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_MOMENTS_KEY);
    return raw ? (JSON.parse(raw) as UserMomentPost[]) : [];
  } catch {
    return [];
  }
}

export function saveUserMoment(post: UserMomentPost) {
  const list = loadUserMoments();
  localStorage.setItem(USER_MOMENTS_KEY, JSON.stringify([post, ...list].slice(0, 30)));
}

export function writeMomentDraft(text: string, tag?: string) {
  sessionStorage.setItem(MOMENT_DRAFT_KEY, text);
  if (tag) sessionStorage.setItem(MOMENT_TAG_KEY, tag);
  else sessionStorage.removeItem(MOMENT_TAG_KEY);
}

export function consumeMomentDraft(): string {
  const t = sessionStorage.getItem(MOMENT_DRAFT_KEY) || "";
  sessionStorage.removeItem(MOMENT_DRAFT_KEY);
  return t;
}

export function consumeMomentTag(): string {
  const t = sessionStorage.getItem(MOMENT_TAG_KEY) || "";
  sessionStorage.removeItem(MOMENT_TAG_KEY);
  return t;
}

export function writeOpenerDraft(text: string) {
  sessionStorage.setItem(OPENER_DRAFT_KEY, text);
}

export function consumeOpenerDraft(): string {
  const t = sessionStorage.getItem(OPENER_DRAFT_KEY) || "";
  sessionStorage.removeItem(OPENER_DRAFT_KEY);
  return t;
}
