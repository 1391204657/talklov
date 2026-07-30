"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  createLocalVideoTrack,
  type LocalVideoTrack,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type LocalTrackPublication,
} from "livekit-client";
import type { ActiveCallInfo, CallStatus } from "@/lib/calls";
import { BeautyVideoTrack } from "./BeautyVideoTrack";

type Props = {
  session: ActiveCallInfo;
  onClose: () => void;
  onHangUp: () => void;
  onStatus: (s: CallStatus) => void;
};

export default function CallModal({
  session,
  onHangUp,
  onStatus,
}: Props) {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const cameraTrackRef = useRef<LocalVideoTrack | null>(null);
  const beautyRef = useRef<BeautyVideoTrack | null>(null);
  const rawCamRef = useRef<MediaStreamTrack | null>(null);
  const audioEls = useRef<HTMLMediaElement[]>([]);

  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(session.kind === "audio");
  const [beauty, setBeauty] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [connLabel, setConnLabel] = useState(
    session.role === "caller" && session.status === "ringing"
      ? "正在呼叫…"
      : "连接中…"
  );
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const connectedAt = useRef<number | null>(null);

  const attachRemote = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
      track.attach(remoteVideoRef.current);
    } else if (track.kind === Track.Kind.Audio) {
      const el = track.attach();
      el.autoplay = true;
      el.setAttribute("playsinline", "true");
      el.style.display = "none";
      document.body.appendChild(el);
      audioEls.current.push(el);
    }
  }, []);

  const unpublishVideo = async (room: Room) => {
    const pubs = Array.from(
      room.localParticipant.videoTrackPublications.values()
    );
    for (const pub of pubs) {
      if (pub.track) {
        await room.localParticipant.unpublishTrack(pub.track);
        pub.track.stop();
      }
    }
    beautyRef.current?.stop();
    beautyRef.current = null;
    cameraTrackRef.current?.stop();
    cameraTrackRef.current = null;
    rawCamRef.current?.stop();
    rawCamRef.current = null;
  };

  const publishCamera = useCallback(
    async (
      room: Room,
      withBeauty: boolean,
      facingMode: "user" | "environment"
    ) => {
      await unpublishVideo(room);
      if (session.kind !== "video") return;

      const local = await createLocalVideoTrack({
        facingMode,
        resolution: { width: 720, height: 1280, frameRate: 24 },
      });

      if (withBeauty) {
        const raw = local.mediaStreamTrack.clone();
        rawCamRef.current = raw;
        const processor = new BeautyVideoTrack();
        beautyRef.current = processor;
        processor.setEnabled(true);
        const beautified = await processor.start(raw);
        local.stop();
        await room.localParticipant.publishTrack(beautified, {
          name: "camera",
          source: Track.Source.Camera,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([beautified]);
          localVideoRef.current.style.filter = "none";
          void localVideoRef.current.play().catch(() => {});
        }
        return;
      }

      cameraTrackRef.current = local;
      await room.localParticipant.publishTrack(local, {
        name: "camera",
        source: Track.Source.Camera,
      });
      if (localVideoRef.current) {
        local.attach(localVideoRef.current);
        localVideoRef.current.style.filter = "none";
      }
    },
    [session.kind]
  );

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (!session.livekitConfigured || !session.token || !session.livekitUrl) {
        setError(
          "通话媒体未配置：请在 Vercel 设置 NEXT_PUBLIC_LIVEKIT_URL、LIVEKIT_API_KEY、LIVEKIT_API_SECRET"
        );
        setConnLabel(
          session.role === "caller" ? "正在呼叫…（媒体未配置）" : "已接通（媒体未配置）"
        );
        if (session.kind === "video") {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
              audio: true,
            });
            if (cancelled) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              void localVideoRef.current.play().catch(() => {});
            }
            rawCamRef.current = stream.getVideoTracks()[0] || null;
          } catch {
            setError("无法访问摄像头/麦克风，请检查浏览器权限");
          }
        }
        return;
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _pub: RemoteTrackPublication,
          _participant: RemoteParticipant
        ) => {
          attachRemote(track);
        }
      );
      room.on(RoomEvent.ParticipantConnected, () => {
        setConnLabel("通话中");
        onStatus("accepted");
        if (!connectedAt.current) connectedAt.current = Date.now();
      });
      room.on(RoomEvent.Disconnected, () => {
        if (!cancelled) onHangUp();
      });

      try {
        await room.connect(session.livekitUrl, session.token);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);

        if (session.kind === "video") {
          await publishCamera(room, false, "user");
          setCamOff(false);
        }

        if (session.status === "ringing" && session.role === "caller") {
          setConnLabel("正在呼叫…");
        } else {
          setConnLabel("通话中");
          if (!connectedAt.current) connectedAt.current = Date.now();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "连接失败");
        setConnLabel("连接失败");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      beautyRef.current?.stop();
      beautyRef.current = null;
      cameraTrackRef.current?.stop();
      cameraTrackRef.current = null;
      rawCamRef.current?.stop();
      rawCamRef.current = null;
      audioEls.current.forEach((el) => {
        el.remove();
      });
      audioEls.current = [];
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        room.localParticipant.trackPublications.forEach(
          (pub: LocalTrackPublication) => {
            pub.track?.stop();
          }
        );
        void room.disconnect();
      }
      if (localVideoRef.current?.srcObject) {
        const s = localVideoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
        localVideoRef.current.srcObject = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.callId, session.token, session.livekitUrl]);

  useEffect(() => {
    if (session.status === "accepted") {
      setConnLabel("通话中");
      if (!connectedAt.current) connectedAt.current = Date.now();
    } else if (session.status === "ringing" && session.role === "caller") {
      setConnLabel("正在呼叫…");
    }
  }, [session.status, session.role]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (connectedAt.current) {
        setElapsed(Math.floor((Date.now() - connectedAt.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const toggleMute = async () => {
    const room = roomRef.current;
    const next = !muted;
    setMuted(next);
    if (room) await room.localParticipant.setMicrophoneEnabled(!next);
  };

  const toggleCam = async () => {
    if (session.kind !== "video") return;
    const room = roomRef.current;
    const nextOff = !camOff;
    setCamOff(nextOff);
    if (!room) {
      if (nextOff && localVideoRef.current?.srcObject) {
        const s = localVideoRef.current.srcObject as MediaStream;
        s.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      } else if (localVideoRef.current?.srcObject) {
        const s = localVideoRef.current.srcObject as MediaStream;
        s.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
      }
      return;
    }
    if (nextOff) {
      await unpublishVideo(room);
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    } else {
      await publishCamera(room, beauty, facing);
    }
  };

  const toggleBeauty = async () => {
    if (session.kind !== "video" || camOff) return;
    const next = !beauty;
    setBeauty(next);
    const room = roomRef.current;
    if (!room || !session.livekitConfigured) {
      if (localVideoRef.current) {
        localVideoRef.current.style.filter = next
          ? "brightness(1.1) contrast(1.04) saturate(1.08) blur(0.7px)"
          : "none";
      }
      return;
    }
    await publishCamera(room, next, facing);
  };

  const flipCamera = async () => {
    if (session.kind !== "video" || camOff) return;
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    const room = roomRef.current;
    if (room && session.livekitConfigured) {
      await publishCamera(room, beauty, next);
    }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-black text-white">
      <div className="relative min-h-0 flex-1">
        {session.kind === "video" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover bg-[#1a121f]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#2a1f32] to-[#1a121f]">
            <div
              className="h-32 w-32 rounded-full bg-cover bg-center bg-white/10"
              style={
                session.peer.photo
                  ? { backgroundImage: `url(${session.peer.photo})` }
                  : undefined
              }
            />
            <p className="mt-4 text-xl font-semibold">{session.peer.name}</p>
          </div>
        )}

        {session.kind === "video" && !camOff && (
          <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] h-36 w-28 overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] px-4 text-center">
          <p className="text-sm font-medium drop-shadow">{session.peer.name}</p>
          <p className="text-xs text-white/70 drop-shadow">
            {connectedAt.current ? `${mm}:${ss}` : connLabel}
          </p>
          {error && (
            <p className="mx-auto mt-2 max-w-sm rounded-lg bg-black/50 px-3 py-1.5 text-[11px] text-amber-200">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 bg-black/80 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <Ctrl
          label={muted ? "取消静音" : "静音"}
          active={muted}
          onClick={toggleMute}
        >
          <MicIcon off={muted} />
        </Ctrl>
        {session.kind === "video" && (
          <>
            <Ctrl
              label={camOff ? "开摄像头" : "关摄像头"}
              active={camOff}
              onClick={toggleCam}
            >
              <CamIcon off={camOff} />
            </Ctrl>
            <Ctrl label="翻转" onClick={flipCamera}>
              <FlipIcon />
            </Ctrl>
            <Ctrl label="美颜" active={beauty} onClick={toggleBeauty}>
              <BeautyIcon />
            </Ctrl>
          </>
        )}
        <button
          type="button"
          onClick={onHangUp}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff3b30] shadow-lg"
          aria-label="挂断"
        >
          <HangupIcon />
        </button>
      </div>
    </div>
  );
}

function Ctrl({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-full ${
        active ? "bg-white text-black" : "bg-white/15 text-white"
      }`}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function MicIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      {off ? (
        <>
          <path d="M9 9v3a3 3 0 0 0 5.1 2.1" />
          <path d="M15 9.5V5a3 3 0 0 0-5.2-2" />
          <path d="M5 10a7 7 0 0 0 11 5.7" />
          <path d="M19 10v1" />
          <path d="M12 19v3" />
          <path d="M4 4l16 16" />
        </>
      ) : (
        <>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </>
      )}
    </svg>
  );
}

function CamIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="13" height="10" rx="2" />
      <path d="m16 10 5-2v8l-5-2" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 4h4v4" />
      <path d="M20 4 14 10" />
      <path d="M8 20H4v-4" />
      <path d="m4 20 6-6" />
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

function BeautyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <circle cx="12" cy="12" r="4" />
      <path d="m6.5 6.5 1.5 1.5" />
      <path d="m16 16 1.5 1.5" />
    </svg>
  );
}

function HangupIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path
        d="M6.6 3.8c.5-.5 1.3-.5 1.8 0l1.7 1.7c.4.4.5 1.1.2 1.6L9.3 9.1c1.7 2.8 4 5 6.9 6.6l2-1c.5-.3 1.2-.2 1.6.2l1.7 1.7c.5.5.5 1.3 0 1.8l-1.5 1.5c-.5.5-1.2.7-1.9.5C11.6 18.4 5.7 12.5 3.7 5.9c-.2-.7 0-1.4.5-1.9L6.6 3.8Z"
        transform="rotate(135 12 12)"
      />
    </svg>
  );
}
