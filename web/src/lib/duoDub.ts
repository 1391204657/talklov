/**
 * Duo Dub / daily listening challenge — copyright-safe original lines.
 * Audio playback uses TTS in MVP; ops can later swap in uploaded clips via daily_challenges.
 */

export type DubRoleId = "a" | "b";

export type DailyChallenge = {
  id: string;
  title: string;
  /** Style note only — never claim real movie audio. */
  styleHint: string;
  /** Full bilingual cue for listening. */
  lineEn: string;
  lineZh: string;
  /** Cloze answer (lowercase compare). */
  blankWord: string;
  /** Display sentence with _____ for the blank (English side). */
  clozeEn: string;
  choices: string[];
  roleA: { id: DubRoleId; label: string; lang: "en" | "zh"; line: string };
  roleB: { id: DubRoleId; label: string; lang: "en" | "zh"; line: string };
};

/** Seed pack — rotate by day-of-year. Original dialogue, not licensed media. */
export const DAILY_CHALLENGE_PACK: DailyChallenge[] = [
  {
    id: "dc-coffee-seat",
    title: "咖啡店偶遇",
    styleHint: "原创 · 轻喜剧风格",
    lineEn: "Is this seat taken? I usually get an oat latte.",
    lineZh: "这座位有人吗？我一般点燕麦拿铁。",
    blankWord: "latte",
    clozeEn: "Is this seat taken? I usually get an oat _____.",
    choices: ["latte", "mocha", "bagel", "wifi"],
    roleA: {
      id: "a",
      label: "英文角色",
      lang: "en",
      line: "Is this seat taken? I usually get an oat latte.",
    },
    roleB: {
      id: "b",
      label: "中文角色",
      lang: "zh",
      line: "没有，请坐。我也常点少甜的。",
    },
  },
  {
    id: "dc-rain-share",
    title: "雨天借伞",
    styleHint: "原创 · 都市相遇",
    lineEn: "Wow, it is pouring. Want to share my umbrella?",
    lineZh: "哇，雨下得好大。要不要一起打伞？",
    blankWord: "umbrella",
    clozeEn: "Wow, it is pouring. Want to share my _____?",
    choices: ["umbrella", "subway", "jacket", "ticket"],
    roleA: {
      id: "a",
      label: "英文角色",
      lang: "en",
      line: "Wow, it is pouring. Want to share my umbrella?",
    },
    roleB: {
      id: "b",
      label: "中文角色",
      lang: "zh",
      line: "太好了，谢谢！我刚好没带伞。",
    },
  },
  {
    id: "dc-first-date",
    title: "第一次约会",
    styleHint: "原创 · 约会破冰",
    lineEn: "Honestly, I was a little nervous before this.",
    lineZh: "说实话，来之前我有点紧张。",
    blankWord: "nervous",
    clozeEn: "Honestly, I was a little _____ before this.",
    choices: ["nervous", "famous", "hungry", "busy"],
    roleA: {
      id: "a",
      label: "英文角色",
      lang: "en",
      line: "Honestly, I was a little nervous before this.",
    },
    roleB: {
      id: "b",
      label: "中文角色",
      lang: "zh",
      line: "我也是，不过现在好多了。",
    },
  },
  {
    id: "dc-language-swap",
    title: "语伴约定",
    styleHint: "原创 · 语伴日常",
    lineEn: "How about ten minutes English, then ten minutes Chinese?",
    lineZh: "要不先十分钟英语，再十分钟中文？",
    blankWord: "minutes",
    clozeEn: "How about ten _____ English, then ten minutes Chinese?",
    choices: ["minutes", "hours", "pages", "songs"],
    roleA: {
      id: "a",
      label: "英文角色",
      lang: "en",
      line: "How about ten minutes English, then ten minutes Chinese?",
    },
    roleB: {
      id: "b",
      label: "中文角色",
      lang: "zh",
      line: "好啊，那我们现在开始计时！",
    },
  },
  {
    id: "dc-weekend-plan",
    title: "周末计划",
    styleHint: "原创 · 朋友闲聊",
    lineEn: "If the weather holds, we could hike this weekend.",
    lineZh: "如果天气不错，这周末可以去徒步。",
    blankWord: "hike",
    clozeEn: "If the weather holds, we could _____ this weekend.",
    choices: ["hike", "hide", "hire", "hope"],
    roleA: { id: "a", label: "英文角色", lang: "en", line: "If the weather holds, we could hike this weekend." },
    roleB: { id: "b", label: "中文角色", lang: "zh", line: "我带点零食，你定路线？" },
  },
  {
    id: "dc-lost-direction",
    title: "问路",
    styleHint: "原创 · 旅行场景",
    lineEn: "Excuse me, is the subway station nearby?",
    lineZh: "请问，地铁站在附近吗？",
    blankWord: "subway",
    clozeEn: "Excuse me, is the _____ station nearby?",
    choices: ["subway", "bus", "train", "radio"],
    roleA: { id: "a", label: "英文角色", lang: "en", line: "Excuse me, is the subway station nearby?" },
    roleB: { id: "b", label: "中文角色", lang: "zh", line: "往前走两个路口，左转就能看到。" },
  },
  {
    id: "dc-food-rec",
    title: "推荐美食",
    styleHint: "原创 · 吃货日常",
    lineEn: "You have to try the dumplings here. They are amazing.",
    lineZh: "你一定要试试这里的饺子，超好吃。",
    blankWord: "dumplings",
    clozeEn: "You have to try the _____ here. They are amazing.",
    choices: ["dumplings", "noodles", "burgers", "salads"],
    roleA: { id: "a", label: "英文角色", lang: "en", line: "You have to try the dumplings here. They are amazing." },
    roleB: { id: "b", label: "中文角色", lang: "zh", line: "好的！要蘸醋吗？" },
  },
  {
    id: "dc-movie-night",
    title: "电影之夜",
    styleHint: "原创 · 朋友闲聊",
    lineEn: "Want to watch a movie tonight? I heard the new one is great.",
    lineZh: "今晚要不要看电影？听说新片很不错。",
    blankWord: "movie",
    clozeEn: "Want to watch a _____ tonight? I heard the new one is great.",
    choices: ["movie", "match", "drama", "video"],
    roleA: { id: "a", label: "英文角色", lang: "en", line: "Want to watch a movie tonight? I heard the new one is great." },
    roleB: { id: "b", label: "中文角色", lang: "zh", line: "好呀！爆米花我来准备。" },
  },
  {
    id: "dc-gym-buddy",
    title: "健身搭子",
    styleHint: "原创 · 运动社交",
    lineEn: "Do you want to hit the gym together tomorrow morning?",
    lineZh: "明天早上一起去健身房吗？",
    blankWord: "gym",
    clozeEn: "Do you want to hit the _____ together tomorrow morning?",
    choices: ["gym", "park", "pool", "mall"],
    roleA: { id: "a", label: "英文角色", lang: "en", line: "Do you want to hit the gym together tomorrow morning?" },
    roleB: { id: "b", label: "中文角色", lang: "zh", line: "好啊，几点？我怕起不来哈哈。" },
  },
  {
    id: "dc-compliment",
    title: "夸人时刻",
    styleHint: "原创 · 社交暖场",
    lineEn: "Your outfit looks amazing today. Is that new?",
    lineZh: "你今天穿得好好看！是新买的吗？",
    blankWord: "outfit",
    clozeEn: "Your _____ looks amazing today. Is that new?",
    choices: ["outfit", "haircut", "laptop", "backpack"],
    roleA: { id: "a", label: "英文角色", lang: "en", line: "Your outfit looks amazing today. Is that new?" },
    roleB: { id: "b", label: "中文角色", lang: "zh", line: "谢谢！打折的时候买的，超划算。" },
  },
  {
    id: "dc-pet-talk",
    title: "聊宠物",
    styleHint: "原创 · 轻松闲聊",
    lineEn: "I just adopted a kitten. She is so tiny and fluffy.",
    lineZh: "我刚领养了一只小猫，又小又蓬松。",
    blankWord: "kitten",
    clozeEn: "I just adopted a _____. She is so tiny and fluffy.",
    choices: ["kitten", "puppy", "rabbit", "parrot"],
    roleA: { id: "a", label: "英文角色", lang: "en", line: "I just adopted a kitten. She is so tiny and fluffy." },
    roleB: { id: "b", label: "中文角色", lang: "zh", line: "太可爱了！叫什么名字？给我看看照片！" },
  },
];

export function todaysChallenge(now = new Date()): DailyChallenge {
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_CHALLENGE_PACK[day % DAILY_CHALLENGE_PACK.length];
}

export function preferredRole(
  country: string | undefined
): DubRoleId {
  // CN users dub English (A); US users dub Chinese (B) by default.
  return country === "US" ? "b" : "a";
}

export function otherRole(role: DubRoleId): DubRoleId {
  return role === "a" ? "b" : "a";
}

export const DUO_INVITES_KEY = "talklov_duo_invites_v1";

export type DuoInvite = {
  id: string;
  challengeId: string;
  challengeTitle: string;
  styleHint: string;
  takenRole: DubRoleId;
  neededRole: DubRoleId;
  takenLine: string;
  neededLine: string;
  /** data URL of user's take (local MVP). */
  audioDataUrl: string;
  authorName: string;
  createdAt: string;
};

export function loadDuoInvites(): DuoInvite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DUO_INVITES_KEY);
    return raw ? (JSON.parse(raw) as DuoInvite[]) : [];
  } catch {
    return [];
  }
}

export function saveDuoInvite(invite: DuoInvite) {
  const list = [invite, ...loadDuoInvites().filter((x) => x.id !== invite.id)].slice(
    0,
    40
  );
  localStorage.setItem(DUO_INVITES_KEY, JSON.stringify(list));
}

export function getDuoInvite(id: string): DuoInvite | undefined {
  return loadDuoInvites().find((x) => x.id === id);
}

export function buildDuoMomentText(invite: DuoInvite): string {
  const need =
    invite.neededRole === "a" ? "英文角色" : "中文角色";
  const taken =
    invite.takenRole === "a" ? "英文角色" : "中文角色";
  return `我配了「${invite.challengeTitle}」的${taken}，还差一个母语者来配${need}！点击和我合配这段原创双语名场面～\n（${invite.styleHint}）`;
}

export function buildDuoOpenerText(invite: DuoInvite): string {
  const need =
    invite.neededRole === "a" ? "English line" : "中文台词";
  return `刚练了今日合配「${invite.challengeTitle}」，我已录好一边。要不要来配另一边的 ${need}？完成后我们就能听一段双人秀 🎙️`;
}

export function speakLine(text: string, lang: "en" | "zh") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "zh" ? "zh-CN" : "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  } catch {}
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
