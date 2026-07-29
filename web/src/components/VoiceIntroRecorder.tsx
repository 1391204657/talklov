"use client";

import { useEffect, useRef, useState } from "react";
import type { MyProfile } from "@/lib/profile";
import { playVoiceIntro, stopVoiceIntro, voiceHintFor } from "@/lib/voiceIntro";

const MAX_SEC = 10;

export function VoiceIntroRecorder({
  value,
  onChange,
}: {
  value: Pick<
    MyProfile,
    "voiceIntroUrl" | "country" | "nativeLang" | "chineseVariants" | "gender"
  >;
  onChange: (p: Partial<MyProfile>) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => cleanup(false), []);

  const clearTimers = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (maxRef.current) clearTimeout(maxRef.current);
    tickRef.current = null;
    maxRef.current = null;
  };

  const cleanup = (keepUrl = true) => {
    clearTimers();
    try {
      if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    } catch {}
    mrRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopVoiceIntro();
    if (!keepUrl) setPlaying(false);
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });

  const stopRecording = () => {
    clearTimers();
    setRecording(false);
    try {
      if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    } catch {}
  };

  const startRecording = async () => {
    setErr(null);
    stopVoiceIntro();
    setPlaying(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        try {
          if (blob.size < 800) {
            setErr("录音太短，请再说几句（约 5–10 秒）");
          } else {
            const url = await blobToDataUrl(blob);
            if (url) onChange({ voiceIntroUrl: url });
          }
        } catch {
          setErr("保存录音失败，请重试");
        }
        mrRef.current = null;
      };
      mrRef.current = mr;
      mr.start();
      setRecording(true);
      setSecs(0);
      tickRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
      maxRef.current = setTimeout(() => stopRecording(), MAX_SEC * 1000);
    } catch {
      setErr("无法访问麦克风，请检查浏览器权限");
    }
  };

  const remove = () => {
    stopVoiceIntro();
    setPlaying(false);
    onChange({ voiceIntroUrl: "" });
  };

  const togglePlay = async () => {
    if (!value.voiceIntroUrl) return;
    if (playing) {
      stopVoiceIntro();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    await playVoiceIntro(
      {
        url: value.voiceIntroUrl,
        lang: "en-US",
        gender: value.gender === "female" ? "female" : "male",
      },
      () => setPlaying(false)
    );
  };

  return (
    <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">语音介绍</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {voiceHintFor(value)}
          </p>
        </div>
        {value.voiceIntroUrl ? (
          <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success">
            已录制
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white"
          >
            停止 · {Math.min(secs, MAX_SEC)}s / {MAX_SEC}s
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            {value.voiceIntroUrl ? "重新录制" : "开始录制"}
          </button>
        )}

        {value.voiceIntroUrl && !recording && (
          <>
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-full border border-line bg-background px-4 py-2 text-sm"
            >
              {playing ? "停止播放" : "试听"}
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-full px-3 py-2 text-sm text-muted"
            >
              删除
            </button>
          </>
        )}
      </div>

      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  );
}
