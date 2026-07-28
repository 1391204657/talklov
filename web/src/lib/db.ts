"use client";

import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./supabase/client";
import { ChatMessage, Profile } from "./types";
import { parseChineseVariants } from "./profile";

// ---- Row shapes as stored in Postgres (snake_case) ----
export interface DbProfile {
  id: string;
  handle: string | null;
  name: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  country: string | null;
  city: string | null;
  native_lang: string | null;
  learning_lang: string | null;
  level: string | null;
  intents: string[];
  interests: string[];
  bio: string | null;
  avatar_url: string | null;
  photos: string[] | null;
  occupation: string | null;
  education: string | null;
  zodiac: string | null;
  chinese_variant: string | null;
  photo_privacy: "public" | "loggedIn" | "verified";
  tier: "light" | "verified";
  verified: boolean;
  online: boolean;
  phone_e164: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "voice";
  content: string | null;
  audio_url: string | null;
  duration_sec: number | null;
  translation: string | null;
  flagged: boolean;
  created_at: string;
}

function timeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ---- Mappers DB -> UI ----
export function toProfile(r: DbProfile): Profile {
  const photos = r.photos?.length ? r.photos : r.avatar_url ? [r.avatar_url] : [];
  return {
    id: r.id,
    name: r.name || "用户",
    age: r.age ?? 0,
    gender: (r.gender === "female" ? "female" : "male") as Profile["gender"],
    country: (r.country === "CN" ? "CN" : "US") as Profile["country"],
    city: r.city ?? "",
    photo: photos[0] ?? r.avatar_url ?? "",
    photos,
    nativeLang: r.native_lang ?? "",
    learningLang: r.learning_lang ?? "",
    level: r.level ?? "",
    intents: (r.intents ?? []) as Profile["intents"],
    interests: r.interests ?? [],
    bio: r.bio ?? "",
    verified: r.verified,
    online: r.online,
    photoPrivacy: r.photo_privacy,
    chineseVariants: parseChineseVariants(r.chinese_variant),
  };
}

export function toChatMessage(r: DbMessage, myId: string): ChatMessage {
  return {
    id: r.id,
    fromMe: r.sender_id === myId,
    kind: r.kind,
    text: r.content ?? (r.kind === "voice" ? "[语音消息]" : ""),
    translation: r.translation ?? undefined,
    audioUrl: r.audio_url ?? undefined,
    durationSec: r.duration_sec ?? undefined,
    time: timeLabel(r.created_at),
    flagged: r.flagged,
  };
}

function must(): SupabaseClient {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Supabase is not configured");
  return sb;
}

// ---- Auth helpers ----
export async function getCurrentUserId(): Promise<string | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

// ---- Profiles ----
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await must()
    .from("profiles")
    .select("*")
    .order("online", { ascending: false });
  if (error) throw error;
  return (data as DbProfile[]).map(toProfile);
}

export async function fetchDbProfile(id: string): Promise<DbProfile | null> {
  const { data, error } = await must()
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DbProfile) ?? null;
}

export function dbToMyPartial(r: DbProfile) {
  const photos =
    r.photos?.length ? r.photos : r.avatar_url ? [r.avatar_url] : [];
  return {
    name: r.name || "",
    gender: (r.gender === "female" ? "female" : "male") as "male" | "female",
    age: r.age,
    country: (r.country === "CN"
      ? "CN"
      : r.country === "US"
      ? "US"
      : "OTHER") as "US" | "CN" | "OTHER",
    city: r.city ?? "",
    occupation: r.occupation ?? "",
    education: r.education ?? "",
    zodiac: r.zodiac ?? "",
    bio: r.bio ?? "",
    interests: r.interests ?? [],
    photos,
    nativeLang: r.native_lang ?? "English",
    learningLang: r.learning_lang ?? "中文",
    level: r.level ?? "",
    phoneE164: r.phone_e164 ?? "",
    chineseVariants: parseChineseVariants(r.chinese_variant),
    intents: (r.intents ?? ["language"]) as (
      | "language"
      | "friends"
      | "romance"
    )[],
    photoPrivacy: r.photo_privacy,
    basicsLocked: Boolean(r.age && r.gender && r.country),
  };
}

export function myProfileToDbPatch(
  id: string,
  p: Partial<{
    name: string;
    gender: string;
    age: number | null;
    country: string;
    city: string;
    occupation: string;
    education: string;
    zodiac: string;
    bio: string;
    interests: string[];
    photos: string[];
    nativeLang: string;
    learningLang: string;
    level: string;
    phoneE164?: string;
    chineseVariants?: ("mandarin" | "cantonese")[];
    intents: string[];
    photoPrivacy: "public" | "loggedIn" | "verified";
  }>
): Partial<DbProfile> & { id: string } {
  const patch: Partial<DbProfile> & { id: string } = { id };
  if (p.name !== undefined) patch.name = p.name;
  if (p.gender !== undefined) patch.gender = p.gender as DbProfile["gender"];
  if (p.age !== undefined) patch.age = p.age;
  if (p.country !== undefined) patch.country = p.country;
  if (p.city !== undefined) patch.city = p.city;
  if (p.occupation !== undefined) patch.occupation = p.occupation;
  if (p.education !== undefined) patch.education = p.education;
  if (p.zodiac !== undefined) patch.zodiac = p.zodiac;
  if (p.bio !== undefined) patch.bio = p.bio;
  if (p.interests !== undefined) patch.interests = p.interests;
  if (p.photos !== undefined) {
    const remote = p.photos.filter((u) => !u.startsWith("data:"));
    // data: URLs stay local until Supabase Storage is wired; don't bloat Postgres.
    if (remote.length) {
      patch.photos = remote;
      patch.avatar_url = remote[0] ?? null;
    }
  }
  if (p.nativeLang !== undefined) patch.native_lang = p.nativeLang;
  if (p.learningLang !== undefined) patch.learning_lang = p.learningLang;
  if (p.level !== undefined) patch.level = p.level;
  if (p.phoneE164 !== undefined) {
    patch.phone_e164 = p.phoneE164 || null;
  }
  if (p.chineseVariants !== undefined) {
    patch.chinese_variant = p.chineseVariants.length
      ? p.chineseVariants.join(",")
      : null;
  }
  if (p.intents !== undefined) patch.intents = p.intents;
  if (p.photoPrivacy !== undefined) patch.photo_privacy = p.photoPrivacy;
  return patch;
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await must()
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as DbProfile) : null;
}

export async function upsertMyProfile(
  patch: Partial<DbProfile> & { id: string }
): Promise<void> {
  const { error } = await must().from("profiles").upsert(patch);
  if (error) throw error;
}

// ---- Conversations & icebreakers (female-first opener flow) ----

/** Create/find a conversation and drop an opening message into the recipient queue. */
export async function sendIcebreaker(
  recipientId: string,
  text: string
): Promise<string> {
  const sb = must();
  const me = await getCurrentUserId();
  if (!me) throw new Error("not signed in");

  // Find existing pair or create a new pending conversation.
  const { data: existing } = await sb
    .from("conversations")
    .select("id,status")
    .eq("initiator_id", me)
    .eq("recipient_id", recipientId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data, error } = await sb
      .from("conversations")
      .insert({ initiator_id: me, recipient_id: recipientId, status: "pending" })
      .select("id")
      .single();
    if (error) throw error;
    conversationId = data.id as string;
  }

  const { error: ibErr } = await sb.from("icebreakers").insert({
    conversation_id: conversationId,
    sender_id: me,
    recipient_id: recipientId,
    text,
    status: "pending",
  });
  if (ibErr) throw ibErr;

  return conversationId;
}

export interface PendingIcebreaker {
  id: string;
  conversationId: string;
  text: string;
  createdAt: string;
  sender: Profile;
}

/** Openers waiting for the current user to accept. */
export async function fetchPendingIcebreakers(): Promise<PendingIcebreaker[]> {
  const sb = must();
  const me = await getCurrentUserId();
  if (!me) return [];

  const { data, error } = await sb
    .from("icebreakers")
    .select("id,conversation_id,text,created_at,sender_id")
    .eq("recipient_id", me)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const senderIds = [...new Set(data.map((d) => d.sender_id as string))];
  const { data: profs } = await sb
    .from("profiles")
    .select("*")
    .in("id", senderIds);
  const map = new Map<string, Profile>(
    (profs as DbProfile[] | null)?.map((p) => [p.id, toProfile(p)]) ?? []
  );

  return data.map((d) => ({
    id: d.id as string,
    conversationId: d.conversation_id as string,
    text: d.text as string,
    createdAt: d.created_at as string,
    sender:
      map.get(d.sender_id as string) ??
      ({ id: d.sender_id, name: "用户" } as Profile),
  }));
}

/** How many openers the current user has sent today (for the daily quota). */
export async function countOpenersToday(): Promise<number> {
  const sb = must();
  const me = await getCurrentUserId();
  if (!me) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await sb
    .from("icebreakers")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", me)
    .gte("created_at", start.toISOString());
  if (error) return 0;
  return count ?? 0;
}

export async function declineIcebreaker(icebreakerId: string): Promise<void> {
  const sb = must();
  const { data, error } = await sb
    .from("icebreakers")
    .update({ status: "declined" })
    .eq("id", icebreakerId)
    .select("conversation_id")
    .single();
  if (error) throw error;
  await sb
    .from("conversations")
    .update({ status: "declined" })
    .eq("id", data.conversation_id);
}

/** Fire `onChange` whenever the pending queue changes (new / updated openers). */
export function subscribePendingIcebreakers(
  myId: string,
  onChange: () => void
): () => void {
  const sb = getSupabaseBrowser();
  if (!sb) return () => {};
  const channel = sb
    .channel(`icebreakers:${myId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "icebreakers",
        filter: `recipient_id=eq.${myId}`,
      },
      () => onChange()
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export interface ConversationSummary {
  conversationId: string;
  otherId: string;
  other: Profile;
  lastMessageAt: string | null;
}

/** Accepted conversations for the current user, most recent first. */
export async function fetchConversations(): Promise<ConversationSummary[]> {
  const sb = must();
  const me = await getCurrentUserId();
  if (!me) return [];

  const { data, error } = await sb
    .from("conversations")
    .select("id,initiator_id,recipient_id,last_message_at")
    .eq("status", "accepted")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const otherIds = data.map((c) =>
    c.initiator_id === me ? c.recipient_id : c.initiator_id
  ) as string[];
  const { data: profs } = await sb
    .from("profiles")
    .select("*")
    .in("id", [...new Set(otherIds)]);
  const map = new Map<string, Profile>(
    (profs as DbProfile[] | null)?.map((p) => [p.id, toProfile(p)]) ?? []
  );

  return data.map((c) => {
    const otherId = (
      c.initiator_id === me ? c.recipient_id : c.initiator_id
    ) as string;
    return {
      conversationId: c.id as string,
      otherId,
      other: map.get(otherId) ?? ({ id: otherId, name: "用户" } as Profile),
      lastMessageAt: (c.last_message_at as string) ?? null,
    };
  });
}

/** Recipient accepts an opener → conversation becomes 'accepted' and opener becomes first message. */
export async function acceptIcebreaker(icebreakerId: string): Promise<void> {
  const sb = must();
  const { data: ib, error } = await sb
    .from("icebreakers")
    .update({ status: "accepted" })
    .eq("id", icebreakerId)
    .select("conversation_id, sender_id, text")
    .single();
  if (error) throw error;

  await sb
    .from("conversations")
    .update({ status: "accepted" })
    .eq("id", ib.conversation_id);

  await sb.from("messages").insert({
    conversation_id: ib.conversation_id,
    sender_id: ib.sender_id,
    kind: "text",
    content: ib.text,
  });
}

/** Find a conversation between me and `otherId` (either direction). */
export async function resolveConversation(
  otherId: string
): Promise<{ id: string; status: string } | null> {
  const sb = must();
  const me = await getCurrentUserId();
  if (!me) return null;
  const { data, error } = await sb
    .from("conversations")
    .select("id,status,initiator_id,recipient_id")
    .or(
      `and(initiator_id.eq.${me},recipient_id.eq.${otherId}),and(initiator_id.eq.${otherId},recipient_id.eq.${me})`
    )
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id as string, status: data.status as string } : null;
}

// ---- Messages + Realtime ----
export async function fetchMessages(
  conversationId: string,
  myId: string
): Promise<ChatMessage[]> {
  const { data, error } = await must()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as DbMessage[]).map((m) => toChatMessage(m, myId));
}

export async function sendMessage(
  conversationId: string,
  msg: {
    kind?: "text" | "voice";
    content?: string;
    audioUrl?: string;
    durationSec?: number;
    translation?: string;
  }
): Promise<void> {
  const sb = must();
  const me = await getCurrentUserId();
  if (!me) throw new Error("not signed in");
  const { error } = await sb.from("messages").insert({
    conversation_id: conversationId,
    sender_id: me,
    kind: msg.kind ?? "text",
    content: msg.content ?? null,
    audio_url: msg.audioUrl ?? null,
    duration_sec: msg.durationSec ?? null,
    translation: msg.translation ?? null,
  });
  if (error) throw error;
}

/** Subscribe to new messages in a conversation. Returns an unsubscribe fn. */
export function subscribeMessages(
  conversationId: string,
  myId: string,
  onInsert: (m: ChatMessage) => void
): () => void {
  const sb = getSupabaseBrowser();
  if (!sb) return () => {};

  const channel: RealtimeChannel = sb
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(toChatMessage(payload.new as DbMessage, myId))
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}
