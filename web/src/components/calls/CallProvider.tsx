"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  apiCallAction,
  apiCreateCall,
  type ActiveCallInfo,
  type CallKind,
  type CallRow,
} from "@/lib/calls";
import { useApp } from "@/lib/store";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  playMessageSound,
  showLocalMessageNotification,
} from "@/lib/notify";
import CallModal from "./CallModal";

type Peer = { id: string; name: string; photo: string };

type CallContextValue = {
  startCall: (opts: {
    conversationId: string;
    peer: Peer;
    kind: CallKind;
  }) => Promise<void>;
  active: ActiveCallInfo | null;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function useCallOptional() {
  return useContext(CallContext);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { userId, notifyPrefs } = useApp();
  const [active, setActive] = useState<ActiveCallInfo | null>(null);
  const [incoming, setIncoming] = useState<{
    call: CallRow;
    peer: Peer;
  } | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeIdRef.current = active?.callId ?? null;
  }, [active?.callId]);

  const clearIncoming = useCallback(() => setIncoming(null), []);

  const startCall = useCallback(
    async (opts: { conversationId: string; peer: Peer; kind: CallKind }) => {
      if (activeIdRef.current) {
        alert("已有通话进行中");
        return;
      }
      try {
        const res = await apiCreateCall({
          conversationId: opts.conversationId,
          calleeId: opts.peer.id,
          kind: opts.kind,
        });
        setIncoming(null);
        setActive({
          callId: res.call.id,
          roomName: res.call.livekit_room,
          token: res.token,
          livekitUrl: res.livekitUrl,
          livekitConfigured: res.livekitConfigured,
          kind: res.call.kind,
          role: "caller",
          status: res.call.status,
          peer: opts.peer,
        });
      } catch (e) {
        alert(e instanceof Error ? e.message : "无法发起通话");
      }
    },
    []
  );

  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;
    const { call, peer } = incoming;
    try {
      const res = await apiCallAction(call.id, "accept");
      setIncoming(null);
      setActive({
        callId: res.call.id,
        roomName: res.call.livekit_room,
        token: res.token,
        livekitUrl: res.livekitUrl,
        livekitConfigured: res.livekitConfigured,
        kind: res.call.kind,
        role: "callee",
        status: "accepted",
        peer,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "接听失败");
    }
  }, [incoming]);

  const rejectIncoming = useCallback(async () => {
    if (!incoming) return;
    const id = incoming.call.id;
    setIncoming(null);
    try {
      await apiCallAction(id, "reject");
    } catch {
      /* ignore */
    }
  }, [incoming]);

  const hangUp = useCallback(async () => {
    const id = activeIdRef.current;
    setActive(null);
    if (!id) return;
    try {
      await apiCallAction(id, "end");
    } catch {
      /* ignore */
    }
  }, []);

  // Subscribe to incoming ringing calls
  useEffect(() => {
    if (!userId) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;

    const channel = sb
      .channel(`calls-incoming:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `callee_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as CallRow;
          if (row.status !== "ringing") return;
          if (handledRef.current.has(row.id)) return;
          if (activeIdRef.current) return;
          handledRef.current.add(row.id);

          let name = "来电";
          let photo = "";
          try {
            const { data } = await sb
              .from("profiles")
              .select("name,avatar_url,photos")
              .eq("id", row.caller_id)
              .maybeSingle();
            if (data) {
              name = (data.name as string) || name;
              const photos = data.photos as string[] | null;
              photo =
                (photos && photos[0]) ||
                (data.avatar_url as string) ||
                "";
            }
          } catch {
            /* ignore */
          }

          setIncoming({
            call: row,
            peer: { id: row.caller_id, name, photo },
          });
          playMessageSound(notifyPrefs.sound);
          showLocalMessageNotification(
            `${name} 来电`,
            row.kind === "video" ? "视频通话" : "语音通话",
            notifyPrefs.push,
            `/chat/${row.caller_id}`
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `callee_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as CallRow;
          if (
            row.status === "ended" ||
            row.status === "missed" ||
            row.status === "rejected"
          ) {
            setIncoming((cur) => (cur?.call.id === row.id ? null : cur));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `caller_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as CallRow;
          setActive((cur) => {
            if (!cur || cur.callId !== row.id) return cur;
            if (
              row.status === "ended" ||
              row.status === "missed" ||
              row.status === "rejected"
            ) {
              return null;
            }
            return { ...cur, status: row.status };
          });
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [userId, notifyPrefs.push, notifyPrefs.sound]);

  // Auto-miss ringing after 45s (caller side)
  useEffect(() => {
    if (!active || active.role !== "caller" || active.status !== "ringing") {
      return;
    }
    const t = window.setTimeout(() => {
      void apiCallAction(active.callId, "miss").finally(() => {
        setActive((cur) => (cur?.callId === active.callId ? null : cur));
      });
    }, 45_000);
    return () => clearTimeout(t);
  }, [active]);

  const value = useMemo(
    () => ({ startCall, active }),
    [startCall, active]
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {incoming && !active && (
        <IncomingOverlay
          peer={incoming.peer}
          kind={incoming.call.kind}
          onAccept={acceptIncoming}
          onReject={rejectIncoming}
        />
      )}
      {active && (
        <CallModal
          session={active}
          onClose={clearIncoming}
          onHangUp={hangUp}
          onStatus={(status) =>
            setActive((cur) => (cur ? { ...cur, status } : cur))
          }
        />
      )}
    </CallContext.Provider>
  );
}

function IncomingOverlay({
  peer,
  kind,
  onAccept,
  onReject,
}: {
  peer: Peer;
  kind: CallKind;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-between bg-gradient-to-b from-[#2a1f32] to-[#1a121f] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-white">
      <div className="mt-10 text-center">
        <p className="text-sm text-white/60">
          {kind === "video" ? "视频来电" : "语音来电"}
        </p>
        <div
          className="mx-auto mt-6 h-28 w-28 rounded-full bg-cover bg-center bg-white/10 shadow-lg"
          style={
            peer.photo
              ? { backgroundImage: `url(${peer.photo})` }
              : undefined
          }
        />
        <h2 className="mt-4 text-2xl font-semibold">{peer.name}</h2>
      </div>
      <div className="mb-8 flex w-full max-w-xs items-center justify-between gap-8">
        <button
          type="button"
          onClick={onReject}
          className="flex flex-col items-center gap-2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff3b30] shadow-lg">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </span>
          <span className="text-xs text-white/70">拒绝</span>
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex flex-col items-center gap-2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#34c759] shadow-lg">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
              <path d="M6.6 3.8c.5-.5 1.3-.5 1.8 0l1.7 1.7c.4.4.5 1.1.2 1.6L9.3 9.1c1.7 2.8 4 5 6.9 6.6l2-1c.5-.3 1.2-.2 1.6.2l1.7 1.7c.5.5.5 1.3 0 1.8l-1.5 1.5c-.5.5-1.2.7-1.9.5C11.6 18.4 5.7 12.5 3.7 5.9c-.2-.7 0-1.4.5-1.9L6.6 3.8Z" />
            </svg>
          </span>
          <span className="text-xs text-white/70">接听</span>
        </button>
      </div>
    </div>
  );
}
