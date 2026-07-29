import type { Gender, Profile } from "./types";
import type { MyProfile } from "./profile";

const DEMO_GREETINGS: Record<string, string> = {
  lin: "大家好，我是林晓，在上海做产品。想找英语语伴，一起聊天、交朋友。",
  mei: "嗨，我是美琪，成都人。英语还在学，希望能遇到耐心又有趣的朋友。",
  jack: "Hey, I'm Jack from Austin. I'm learning Mandarin and would love to practice with you.",
  yuki: "你好，我是雨桐。平时做设计，喜欢深度聊天，也想把英语练得更自然。",
  ryan: "Hi, I'm Ryan in Seattle. I've been to Chengdu twice and I'm still working on my Chinese.",
  shan: "大家好，我是珊珊，广州人，普通话粤语都会。想找人一起练英语、喝早茶。",
  diego: "Hey everyone, I'm Diego. I love food and Mandarin practice — say hi anytime.",
  wen: "大家好，我是小文。想认识认真学语言的朋友，一起互相纠错、互相鼓励。",
  emma: "Hi, I'm Emma. Looking for a steady language exchange partner — Mandarin and English.",
  marcus: "Hey, Marcus here. Let's swap culture stories and keep our language practice light and fun.",
};

const FEMALE_RE =
  /female|woman|girl|zira|samantha|karen|susan|hazel|linda|julie|helen|jenny|aria|sonia|natasha|xiaoxiao|xiaoyi|xiaoxuan|yaoyao|huihui|meijia|sin-?ji|ting-?ting|catherine|moira|fiona|veena|raveena|allison|ava|emma|joanna|ivy|kimberly|kendra|salli|nicole|tessa|victoria|karen|lee|nicky|flo|grandma/i;
const MALE_RE =
  /male|man\b|boy|david|mark|james|george|richard|daniel|fred|bruce|tom|ryan|guy|yunyang|yunxi|yunjian|kangkang|aaron|arthur|brian|christopher|eric|guy|jason|joey|justin|kevin|matthew|nicholas|patrick|stephen|wayne|grandpa|jony|eddy/i;
const NATURAL_RE =
  /neural|natural|online|enhanced|premium|wavenet|studio|multilingual|google|microsoft|siri|eloquence/i;

export function voiceLangFor(
  p: Pick<Profile, "country" | "nativeLang" | "chineseVariants">
): string {
  if (p.country === "US" || p.nativeLang === "English") return "en-US";
  if (
    p.chineseVariants?.includes("cantonese") &&
    !p.chineseVariants.includes("mandarin")
  ) {
    return "zh-HK";
  }
  return "zh-CN";
}

export function voiceHintFor(
  p: Pick<MyProfile, "country" | "nativeLang" | "chineseVariants">
): string {
  if (p.country === "US" || p.nativeLang === "English") {
    return "Record a short hello in English (about 5–10 seconds).";
  }
  if (
    p.chineseVariants?.includes("cantonese") &&
    !p.chineseVariants.includes("mandarin")
  ) {
    return "用粤语录一段自我介绍或打招呼（约 5–10 秒）。";
  }
  if (p.chineseVariants?.includes("cantonese")) {
    return "用普通话或粤语录一段自我介绍或打招呼（约 5–10 秒）。";
  }
  return "用普通话录一段自我介绍或打招呼（约 5–10 秒）。";
}

export type ResolvedVoiceIntro = {
  url?: string;
  text?: string;
  lang: string;
  gender: Gender;
};

/** Returns playable intro, or null if this profile has none. */
export function resolveVoiceIntro(p: Profile): ResolvedVoiceIntro | null {
  const lang = voiceLangFor(p);
  const gender = p.gender === "female" ? "female" : "male";
  if (p.voiceIntroUrl) return { url: p.voiceIntroUrl, lang, gender };
  const text = p.voiceIntroText || DEMO_GREETINGS[p.id];
  if (text) return { text, lang, gender };
  return null;
}

let activeAudio: HTMLAudioElement | null = null;

export function stopVoiceIntro() {
  try {
    activeAudio?.pause();
  } catch {}
  activeAudio = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

function voiceGender(v: SpeechSynthesisVoice): Gender | "unknown" {
  const blob = `${v.name} ${v.voiceURI}`;
  if (FEMALE_RE.test(blob)) return "female";
  if (MALE_RE.test(blob)) return "male";
  return "unknown";
}

function langScore(voiceLang: string, want: string): number {
  const a = voiceLang.toLowerCase();
  const b = want.toLowerCase();
  if (a === b) return 40;
  if (a.startsWith(b.slice(0, 2))) return 22;
  if (b.startsWith("zh") && a.startsWith("zh")) return 18;
  if (b.startsWith("en") && a.startsWith("en")) return 18;
  return -50;
}

function scoreVoice(
  v: SpeechSynthesisVoice,
  lang: string,
  gender: Gender
): number {
  let s = langScore(v.lang, lang);
  const g = voiceGender(v);
  if (g === gender) s += 35;
  else if (g === "unknown") s += 4;
  else s -= 45; // strongly avoid opposite gender
  if (NATURAL_RE.test(`${v.name} ${v.voiceURI}`)) s += 18;
  if (v.localService) s += 6; // often higher quality on device
  // Prefer known good demo voices
  if (/google|microsoft|samantha|alex|daniel|ting-?ting|sin-?ji|yunxi|yunyang|xiaoxiao/i.test(v.name))
    s += 8;
  return s;
}

async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const syn = window.speechSynthesis;
  let voices = syn.getVoices();
  if (voices.length) return voices;
  await new Promise<void>((resolve) => {
    const done = () => {
      syn.onvoiceschanged = null;
      resolve();
    };
    syn.onvoiceschanged = done;
    window.setTimeout(done, 600);
  });
  return syn.getVoices();
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  gender: Gender
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const ranked = [...voices].sort(
    (a, b) => scoreVoice(b, lang, gender) - scoreVoice(a, lang, gender)
  );
  const best = ranked[0];
  // If best still opposite gender and we have a same-gender option in any related lang, prefer that
  const same = ranked.find((v) => voiceGender(v) === gender && langScore(v.lang, lang) > 0);
  if (same && voiceGender(best) !== gender) return same;
  return best ?? null;
}

/** Play recorded audio, or gender-matched TTS when only demo text is available. */
export async function playVoiceIntro(
  intro: ResolvedVoiceIntro,
  onEnded?: () => void
): Promise<"audio" | "tts" | "failed"> {
  stopVoiceIntro();
  if (intro.url) {
    try {
      const audio = new Audio(intro.url);
      activeAudio = audio;
      audio.onended = () => onEnded?.();
      audio.onerror = () => onEnded?.();
      await audio.play();
      return "audio";
    } catch {
      onEnded?.();
      return "failed";
    }
  }
  if (intro.text && typeof window !== "undefined" && "speechSynthesis" in window) {
    const voices = await loadVoices();
    const voice = pickVoice(voices, intro.lang, intro.gender);
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(intro.text);
      u.lang = voice?.lang || intro.lang;
      if (voice) u.voice = voice;
      // Slightly slower + gendered pitch reads less "robot default"
      u.rate = 0.92;
      u.pitch = intro.gender === "male" ? 0.82 : 1.08;
      u.onend = () => {
        onEnded?.();
        resolve("tts");
      };
      u.onerror = () => {
        onEnded?.();
        resolve("failed");
      };
      // Chrome sometimes drops first speak if voices just loaded
      window.setTimeout(() => window.speechSynthesis.speak(u), 40);
    });
  }
  onEnded?.();
  return "failed";
}
