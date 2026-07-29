"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DailyChallenge,
  DuoInvite,
  blobToDataUrl,
  buildDuoMomentText,
  buildDuoOpenerText,
  otherRole,
  preferredRole,
  saveDuoInvite,
  speakLine,
  todaysChallenge,
  type DubRoleId,
} from "@/lib/duoDub";
import { saveUserMoment, writeMomentDraft, writeOpenerDraft, saveLearnRecord } from "@/lib/datingSim";
import { useApp } from "@/lib/store";

type Phase = "listen" | "quiz" | "record" | "done" | "partner";

export default function DuoDubModal({
  open,
  onClose,
  /** Join someone else's invite (record the needed role). */
  joinInvite = null,
}: {
  open: boolean;
  onClose: () => void;
  joinInvite?: DuoInvite | null;
}) {
  const router = useRouter();
  const { tier, myProfile, openRegister } = useApp();
  const challenge: DailyChallenge = todaysChallenge();
  const [phase, setPhase] = useState<Phase>("listen");
  const [picked, setPicked] = useState<string | null>(null);
  const [quizOk, setQuizOk] = useState<boolean | null>(null);
  const [myRole, setMyRole] = useState<DubRoleId>("a");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [invite, setInvite] = useState<DuoInvite | null>(null);
  const [partnerAudio, setPartnerAudio] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setQuizOk(null);
    setAudioUrl("");
    setInvite(null);
    setPartnerAudio("");
    setErr(null);
    setSecs(0);
    if (joinInvite) {
      setPhase("partner");
      setMyRole(joinInvite.neededRole);
    } else {
      setPhase("listen");
      setMyRole(preferredRole(myProfile.country));
    }
  }, [open, joinInvite, myProfile.country]);

  useEffect(() => {
    return () => cleanupRec();
  }, []);

  const cleanupRec = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (maxRef.current) clearTimeout(maxRef.current);
    tickRef.current = null;
    maxRef.current = null;
    try {
      if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  };

  const playDemo = () => {
    // MVP: TTS stand-in for ops-uploaded ≤10s clip
    speakLine(challenge.lineEn, "en");
    window.setTimeout(() => speakLine(challenge.lineZh, "zh"), 2200);
  };

  const playMyLine = () => {
    const role = myRole === "a" ? challenge.roleA : challenge.roleB;
    speakLine(role.line, role.lang);
  };

  const checkQuiz = () => {
    if (!picked) return;
    const ok = picked.toLowerCase() === challenge.blankWord.toLowerCase();
    setQuizOk(ok);
    if (ok) window.setTimeout(() => setPhase("record"), 500);
  };

  const startRec = async () => {
    setErr(null);
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
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
        if (blob.size < 600) {
          setErr("录音太短，请再试一次（约 3–10 秒）");
          return;
        }
        try {
          const url = await blobToDataUrl(blob);
          if (joinInvite) {
            setPartnerAudio(url);
            setPhase("done");
          } else {
            finishSolo(url);
          }
        } catch {
          setErr("保存录音失败");
        }
      };
      mrRef.current = mr;
      mr.start();
      setRecording(true);
      setSecs(0);
      tickRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
      maxRef.current = setTimeout(() => stopRec(), 10_000);
    } catch {
      setErr("无法访问麦克风，请检查权限");
    }
  };

  const stopRec = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (maxRef.current) clearTimeout(maxRef.current);
    tickRef.current = null;
    maxRef.current = null;
    setRecording(false);
    try {
      if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    } catch {}
  };

  const finishSolo = (url: string) => {
    setAudioUrl(url);
    const taken = myRole;
    const needed = otherRole(taken);
    const takenMeta = taken === "a" ? challenge.roleA : challenge.roleB;
    const needMeta = needed === "a" ? challenge.roleA : challenge.roleB;
    const inv: DuoInvite = {
      id: `duo-${Date.now()}`,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      styleHint: challenge.styleHint,
      takenRole: taken,
      neededRole: needed,
      takenLine: takenMeta.line,
      neededLine: needMeta.line,
      audioDataUrl: url,
      authorName: myProfile.name.trim() || "我",
      createdAt: new Date().toISOString(),
    };
    saveDuoInvite(inv);
    try {
      saveLearnRecord(
        {
          naturalness: 80,
          politeness: 85,
          vibe: 82,
          stars: 4,
          summary: `完成合配挑战「${challenge.title}」`,
          bestLine: takenMeta.line,
          tip: "",
        },
        { id: challenge.id, title: `合配 · ${challenge.title}` }
      );
    } catch {}
    setInvite(inv);
    setPhase("done");
  };

  const shareMoment = () => {
    if (!invite) return;
    if (tier === "guest") {
      openRegister("晒合配卡片");
      return;
    }
    const text = buildDuoMomentText(invite);
    writeMomentDraft(text, "合配挑战");
    saveUserMoment({
      id: `um-${Date.now()}`,
      text,
      time: "刚刚",
      likes: 0,
      comments: [],
      corrections: [],
      tag: "合配挑战",
      duoInviteId: invite.id,
    });
    onClose();
    router.push("/moments");
  };

  const shareMatch = () => {
    if (!invite) return;
    if (tier === "guest") {
      openRegister("发给搭子");
      return;
    }
    writeOpenerDraft(buildDuoOpenerText(invite));
    onClose();
    router.push("/messages?share=1");
  };

  if (!open) return null;

  const roleMeta = myRole === "a" ? challenge.roleA : challenge.roleB;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center">
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <div className="text-[11px] text-muted">今日合配</div>
            <h2 className="text-base font-semibold">{challenge.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              cleanupRec();
              onClose();
            }}
            className="rounded-full px-2 py-1 text-muted"
            aria-label="关闭"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="text-xs text-muted">{challenge.styleHint} · 示范音为 TTS，正式环境可换上传原声</p>

          {phase === "listen" && (
            <>
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="text-sm font-medium">第一步：听原声</div>
                <p className="mt-2 text-[15px] leading-relaxed">{challenge.lineEn}</p>
                <p className="mt-1 text-sm text-muted">{challenge.lineZh}</p>
                <button
                  type="button"
                  onClick={playDemo}
                  className="btn-grad mt-4 w-full rounded-xl py-3 text-sm font-semibold"
                >
                  🔊 播放示范（约 10 秒内）
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPhase("quiz")}
                className="w-full rounded-xl border border-line py-3 text-sm font-medium"
              >
                听完了，去选词 →
              </button>
            </>
          )}

          {phase === "quiz" && (
            <>
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="text-sm font-medium">听力填空</div>
                <p className="mt-2 text-[15px] leading-relaxed">{challenge.clozeEn}</p>
                <button
                  type="button"
                  onClick={() => speakLine(challenge.lineEn, "en")}
                  className="mt-3 text-sm text-accent"
                >
                  再听一遍英文
                </button>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {challenge.choices.map((c) => {
                    const active = picked === c;
                    const wrong =
                      quizOk === false && active;
                    const right =
                      quizOk === true &&
                      c.toLowerCase() === challenge.blankWord.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setPicked(c);
                          setQuizOk(null);
                        }}
                        className={`rounded-xl border px-3 py-2.5 text-sm ${
                          right
                            ? "border-success bg-success/15 text-success"
                            : wrong
                              ? "border-red-400 bg-red-500/10 text-red-600"
                              : active
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-line"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                {quizOk === false && (
                  <p className="mt-2 text-xs text-red-500">再听一次，选你听到的核心词。</p>
                )}
              </div>
              <button
                type="button"
                disabled={!picked}
                onClick={checkQuiz}
                className="btn-grad w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
              >
                提交
              </button>
            </>
          )}

          {(phase === "record" || phase === "partner") && (
            <>
              <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
                <div className="text-sm font-semibold">
                  {phase === "partner"
                    ? "轮到你合配另一边！"
                    : "答对了 · 轮到你配音！"}
                </div>
                <p className="mt-1 text-xs text-muted">
                  你来配：{roleMeta.label}（{roleMeta.lang === "en" ? "English" : "中文"}）
                </p>
                <p className="mt-3 text-[15px] font-medium leading-relaxed">
                  「{roleMeta.line}」
                </p>
                <button
                  type="button"
                  onClick={playMyLine}
                  className="mt-3 text-sm text-accent"
                >
                  🔊 听我要配的这句
                </button>
              </div>

              {!joinInvite && phase === "record" && (
                <div className="flex gap-2">
                  {(
                    [
                      { id: "a" as const, label: challenge.roleA.label },
                      { id: "b" as const, label: challenge.roleB.label },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setMyRole(r.id)}
                      className={`flex-1 rounded-xl border py-2 text-xs ${
                        myRole === r.id
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-line text-muted"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={recording ? stopRec : startRec}
                className={`w-full rounded-2xl py-3.5 text-sm font-semibold ${
                  recording
                    ? "bg-red-500 text-white"
                    : "btn-grad"
                }`}
              >
                {recording
                  ? `录音中 ${Math.min(secs, 10)}s · 点此结束`
                  : "点一下开始配音（最长 10 秒）"}
              </button>
              {err && <p className="text-xs text-red-500">{err}</p>}
            </>
          )}

          {phase === "done" && (
            <>
              {joinInvite && partnerAudio ? (
                <div className="space-y-3 rounded-2xl border border-success/30 bg-success/10 p-4">
                  <div className="text-lg font-bold">合配完成 🎉</div>
                  <p className="text-sm text-muted">
                    已录好另一边。下面可分别试听双方（本机演示合成）。
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs text-muted">对方 · {joinInvite.takenLine}</div>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls src={joinInvite.audioDataUrl} className="w-full" />
                    <div className="text-xs text-muted">你 · {roleMeta.line}</div>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls src={partnerAudio} className="w-full" />
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-grad w-full rounded-xl py-3 text-sm font-semibold"
                  >
                    完成
                  </button>
                </div>
              ) : invite ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4 text-center">
                    <div className="text-3xl">🎬</div>
                    <div className="mt-2 text-lg font-bold">寻找另一半配音</div>
                    <p className="mt-1 text-sm text-muted">
                      你已配好
                      {invite.takenRole === "a" ? "英文" : "中文"}
                      角色，还差另一边母语者。
                    </p>
                  </div>
                  {audioUrl && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio controls src={audioUrl} className="w-full" />
                  )}
                  <button
                    type="button"
                    onClick={shareMoment}
                    className="btn-grad w-full rounded-2xl py-3.5 text-sm font-semibold"
                  >
                    一键晒到动态找合配
                  </button>
                  <button
                    type="button"
                    onClick={shareMatch}
                    className="w-full rounded-2xl border border-line bg-surface py-3.5 text-sm font-semibold"
                  >
                    发给搭子
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-sm text-muted"
                  >
                    稍后再说
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
