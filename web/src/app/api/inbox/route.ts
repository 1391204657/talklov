import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapPublicProfile, type PublicProfileRow } from "@/lib/profileMap";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SELECT_SAFE =
  "id,handle,name,age,gender,country,city,native_lang,learning_lang,level,intents,interests,bio,avatar_url,photos,occupation,education,zodiac,chinese_variant,photo_privacy,tier,verified,online,plan,plan_expires_at,is_founder,founder_slot,founder_last_active_at,boost_until,created_at,updated_at,banned_at";

async function loadProfilesById(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  ids: string[]
): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;

  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const { data } = await admin
      .from("profiles")
      .select(SELECT_SAFE)
      .in("id", chunk);
    for (const row of data || []) {
      const r = row as PublicProfileRow & { banned_at?: string | null };
      if (r.banned_at) continue;
      if (!(r.name || "").trim()) {
        try {
          const { data: u } = await admin.auth.admin.getUserById(r.id);
          const local = u.user?.email?.split("@")[0]?.trim();
          if (local) r.name = local;
        } catch {
          /* ignore */
        }
      }
      map.set(r.id, mapPublicProfile(r));
    }
  }
  return map;
}

/**
 * Same-origin inbox: pending hellos + accepted chats with full peer profiles.
 * Avoids RLS stripping name/photos on direct browser→profiles selects.
 */
export async function GET() {
  const sb = await getSupabaseServer();
  const admin = getSupabaseAdmin();
  if (!sb || !admin) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = user.id;

  const [{ data: ice, error: iceErr }, { data: convs, error: convErr }] =
    await Promise.all([
      admin
        .from("icebreakers")
        .select("id,conversation_id,text,created_at,sender_id")
        .eq("recipient_id", me)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      admin
        .from("conversations")
        .select("id,initiator_id,recipient_id,last_message_at,status")
        .eq("status", "accepted")
        .or(`initiator_id.eq.${me},recipient_id.eq.${me}`)
        .order("last_message_at", { ascending: false, nullsFirst: false }),
    ]);

  if (iceErr) {
    return NextResponse.json({ error: iceErr.message }, { status: 500 });
  }
  if (convErr) {
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  }

  const peerIds = [
    ...(ice || []).map((d) => d.sender_id as string),
    ...(convs || []).map((c) =>
      c.initiator_id === me ? (c.recipient_id as string) : (c.initiator_id as string)
    ),
  ];
  const profiles = await loadProfilesById(admin, peerIds);

  const pending = (ice || []).map((d) => {
    const senderId = d.sender_id as string;
    const sender =
      profiles.get(senderId) ||
      ({
        id: senderId,
        name: "用户",
        age: 0,
        gender: "male",
        country: "US",
        city: "",
        photo: "",
        nativeLang: "",
        learningLang: "",
        level: "",
        intents: [],
        interests: [],
        bio: "",
        verified: false,
        online: false,
        photoPrivacy: "public",
      } as Profile);
    return {
      id: d.id as string,
      conversationId: d.conversation_id as string,
      text: d.text as string,
      createdAt: d.created_at as string,
      sender,
    };
  });

  const conversations = (convs || []).map((c) => {
    const otherId = (
      c.initiator_id === me ? c.recipient_id : c.initiator_id
    ) as string;
    const other =
      profiles.get(otherId) ||
      ({
        id: otherId,
        name: "用户",
        age: 0,
        gender: "male",
        country: "US",
        city: "",
        photo: "",
        nativeLang: "",
        learningLang: "",
        level: "",
        intents: [],
        interests: [],
        bio: "",
        verified: false,
        online: false,
        photoPrivacy: "public",
      } as Profile);
    return {
      conversationId: c.id as string,
      otherId,
      other,
      lastMessageAt: (c.last_message_at as string) ?? null,
    };
  });

  return NextResponse.json({
    pending,
    conversations,
    pendingCount: pending.length,
  });
}
