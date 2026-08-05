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
  /** Server stripped photos for this viewer (photo_privacy gate). */
  photosLocked?: boolean;
  /** Spoken Chinese variants (can be both Mandarin + Cantonese). */
  chineseVariants?: ChineseVariant[];
  /** Short voice hello / intro (data URL or remote). */
  voiceIntroUrl?: string;
  /** Demo / caption text used when no recording exists (TTS fallback). */
  voiceIntroText?: string;
  /** Paid plan — independent from verified trust tier. */
  plan?: "free" | "vip" | "founder";
  isFounder?: boolean;
  founderSlot?: number | null;
  founderFrozen?: boolean;
  /** Paid discover boost expiry (ISO). */
  boostUntil?: string | null;
  /** Profile created time (ISO) — newer users rank higher on Discover. */
  createdAt?: string | null;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  kind?: "text" | "voice" | "image" | "video";
  text: string;
  translation?: string;
  audioUrl?: string;
  /** Image / video preview URL (data URL or blob URL). */
  mediaUrl?: string;
  durationSec?: number;
  time: string;
  flagged?: boolean;
  /** Local emoji reaction (client-side for now). */
  reaction?: string | null;
  /** Quoted message preview when this is a reply. */
  replyPreview?: string | null;
}
