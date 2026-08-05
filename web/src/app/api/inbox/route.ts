import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapPublicProfile, type PublicProfileRow } from "@/lib/profileMap";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

const SELECT_SAFE =
  "id,handle,name,age,gender,country,city,native_lang,learning_lang,level,intents,interests,bio,avatar_url,photos,occupation,education,zodiac,chinese_variant,photo_privacy,tier,verified,online,plan,plan_expires_at,is_founder,founder_slot,founder_last_active_at,boost_until,created_at,updated_at,banned_at";

function stubProfile(id: string): Profile {
  return {
    id,
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
  };
}

async function loadProfilesById(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  ids: string[]
): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;

  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const { data, error } = await admin
      .from("profiles")
      .select(SELECT_SAFE)
      .in("id", chunk);
    if (error) {
      console.warn("[api/inbox] profiles", error.message);
      continue;
    }
    for (const row of data || []) {
      const r = row as PublicProfileRow & { banned_at?: string | null };
      if (r.banned_at) continue;
      // Do not call auth.admin.getUserById here — it was slowing/hanging inbox on mobile.
      if (!(r.name || "").trim()) r.name = "用户";
      map.set(r.id, mapPublicProfile(r));
    }
  }
  return map;
}

/**
 * Same-origin inbox: pending hellos + accepted chats with peer profiles.
 */
export async function GET() {
  try {
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

    const [iceRes, convRes] = await Promise.all([
      admin
        .from("icebreakers")
        .select("id,conversation_id,text,created_at,sender_id")
        .eq("recipient_id", me)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("conversations")
        .select("id,initiator_id,recipient_id,last_message_at,status")
        .eq("status", "accepted")
        .or(`initiator_id.eq.${me},recipient_id.eq.${me}`)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100),
    ]);

    if (iceRes.error) {
      console.warn("[api/inbox] icebreakers", iceRes.error.message);
    }
    if (convRes.error) {
      console.warn("[api/inbox] conversations", convRes.error.message);
    }

    const ice = iceRes.data || [];
    const convs = convRes.data || [];

    const peerIds = [
      ...ice.map((d) => d.sender_id as string),
      ...convs.map((c) =>
        c.initiator_id === me
          ? (c.recipient_id as string)
          : (c.initiator_id as string)
      ),
    ];
    const profiles = await loadProfilesById(admin, peerIds);

    const pending = ice.map((d) => {
      const senderId = d.sender_id as string;
      return {
        id: d.id as string,
        conversationId: d.conversation_id as string,
        text: d.text as string,
        createdAt: d.created_at as string,
        sender: profiles.get(senderId) || stubProfile(senderId),
      };
    });

    const conversations = convs.map((c) => {
      const otherId = (
        c.initiator_id === me ? c.recipient_id : c.initiator_id
      ) as string;
      return {
        conversationId: c.id as string,
        otherId,
        other: profiles.get(otherId) || stubProfile(otherId),
        lastMessageAt: (c.last_message_at as string) ?? null,
      };
    });

    return NextResponse.json({
      pending,
      conversations,
      pendingCount: pending.length,
    });
  } catch (e) {
    console.error("[api/inbox]", e);
    return NextResponse.json(
      {
        pending: [],
        conversations: [],
        pendingCount: 0,
        error: e instanceof Error ? e.message : "inbox failed",
      },
      { status: 200 }
    );
  }
}
