export type Gender = "male" | "female";

export type Intent = "language" | "friends" | "romance";

export type PhotoPrivacy = "public" | "loggedIn" | "verified";

export type Tier = "guest" | "light" | "verified";

export type ChineseVariant = "mandarin" | "cantonese";

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  country: "US" | "CN";
  city: string;
  photo: string;
  /** Extra gallery photos for swipe (falls back to [photo]). */
  photos?: string[];
  nativeLang: string;
  learningLang: string;
  level: string;
  intents: Intent[];
  interests: string[];
  bio: string;
  verified: boolean;
  online: boolean;
  photoPrivacy: PhotoPrivacy;
  /** Spoken Chinese variants (can be both Mandarin + Cantonese). */
  chineseVariants?: ChineseVariant[];
  /** Short voice hello / intro (data URL or remote). */
  voiceIntroUrl?: string;
  /** Demo / caption text used when no recording exists (TTS fallback). */
  voiceIntroText?: string;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  kind?: "text" | "voice";
  text: string;
  translation?: string;
  audioUrl?: string;
  durationSec?: number;
  time: string;
  flagged?: boolean;
}
