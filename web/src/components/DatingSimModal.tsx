"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DATING_SCENE,
  DatingScore,
  DatingTurn,
  buildShareMomentText,
  buildShareOpenerText,
  saveLearnRecord,
  writeMomentDraft,
  writeOpenerDraft,
} from "@/lib/datingSim";
import { useApp } from "@/lib/store";

type Phase = "chat" | "scoring" | "result";

function Stars({ n }: { n: number }) {
  return (
    <span className="tracking-tight text-amber-500">
      {"★".repeat(Math.max(0, Math.min(5, n)))}
      <span className="text-muted">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2">
        <div
          className="h-1.5 rounded-full bg-accent"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function DatingSimModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { tier, openRegister } = useApp();
  const [phase, setPhase] = useState<Phase>("chat");
  const [history, setHistory] = useState<DatingTurn[]>([]);
  const [userRound, setUserRound] = useState(0); // 0..3 completed user replies
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [tip, setTip] = useState("");
  const [score, setScore] = useState<DatingScore | null>(null);
  const [redoUsedThisRound, setRedoUsedThisRound] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<SpeechRecognition | null>(null);
  const wantListenRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setPhase("chat");
    setHistory([{ role: "ai", text: DATING_SCENE.opener }]);
    setUserRound(0);
    setInput("");
    setBusy(false);
    setListening(false);
    setTip("");
    setScore(null);
    setRedoUsedThisRound(false);
    wantListenRef.current = false;
    // Soft TTS for opener
    trySpeak(DATING_SCENE.opener);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [history, tip, phase]);

  useEffect(() => {
    return () => {
      wantListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recogRef.current?.abort?.();
        recogRef.current?.stop();
      } catch {}
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const trySpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const en =
        voices.find(
          (v) =>
            /en(-|_)US/i.test(v.lang) &&
            /male|david|mark|alex|guy|daniel/i.test(v.name)
        ) || voices.find((v) => /en(-|_)US/i.test(v.lang));
      if (en) u.voice = en;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const stopListen = (opts?: { userStop?: boolean }) => {
    if (opts?.userStop) wantListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recogRef.current?.stop();
    } catch {}
    setListening(false);
  };

  const attachAndStart = (SR: new () => SpeechRecognition) => {
    try {
      recogRef.current?.abort?.();
      recogRef.current?.stop();
    } catch {}
    const rec = new SR();
    recogRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = true;
    // continuous + manual stop is far more stable in mobile PWAs than press-hold.
    rec.continuous = true;
    let finalText = "";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += `${t} `;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = () => {
      // auto-restart on recoverable errors while user still wants mic on
      if (!wantListenRef.current) {
        setListening(false);
        return;
      }
      restartTimerRef.current = setTimeout(() => {
        if (wantListenRef.current) attachAndStart(SR);
      }, 350);
    };
    rec.onend = () => {
      // Browser often ends after a pause; keep listening until user taps stop.
      if (wantListenRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (wantListenRef.current) attachAndStart(SR);
        }, 280);
        return;
      }
      setListening(false);
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      // InvalidStateError if started too soon — retry once
      restartTimerRef.current = setTimeout(() => {
        if (!wantListenRef.current) return;
        try {
          rec.start();
          setListening(true);
        } catch {
          wantListenRef.current = false;
          setListening(false);
        }
      }, 400);
    }
  };

  const toggleListen = () => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    if (!SR) {
      alert("当前浏览器不支持语音输入，请直接打字。");
      return;
    }
    if (listening || wantListenRef.current) {
      stopListen({ userStop: true });
      cooldownRef.current = Date.now();
      return;
    }
    // Cooldown avoids PWA "start immediately after stop" dropouts
    const wait = Math.max(0, 450 - (Date.now() - cooldownRef.current));
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // mic + TTS conflict on many phones
    }
    wantListenRef.current = true;
    setListening(true);
    restartTimerRef.current = setTimeout(() => {
      if (wantListenRef.current) attachAndStart(SR);
    }, wait || 50);
  };

  const scorePractice = async (full: DatingTurn[]) => {
    setPhase("scoring");
    setBusy(true);
    const apply = (s: DatingScore) => {
      setScore(s);
      try {
        saveLearnRecord(s, DATING_SCENE);
      } catch {}
      setPhase("result");
    };
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dating_score", history: full }),
      });
      const data = await res.json();
      apply({
        naturalness: data.naturalness ?? 75,
        politeness: data.politeness ?? 80,
        vibe: data.vibe ?? 75,
        stars: data.stars ?? 4,
        summary: data.summary || "练得不错！",
        bestLine:
          data.bestLine ||
          full.filter((t) => t.role === "user").at(-1)?.text ||
          "",
        tip: data.tip || "",
      });
    } catch {
      const last = full.filter((t) => t.role === "user").at(-1)?.text || "";
      apply({
        naturalness: 78,
        politeness: 85,
        vibe: 80,
        stars: 4,
        summary: "表达自然度不错，继续保持短句提问。",
        bestLine: last,
        tip: "Ask one curious question back after you answer.",
      });
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy || phase !== "chat") return;
    if (userRound >= DATING_SCENE.rounds) return;

    stopListen({ userStop: true });
    cooldownRef.current = Date.now();
    setBusy(true);

    const lastAi = [...history].reverse().find((h) => h.role === "ai")?.text || "";
    const echoTip = looksLikeEcho(text, lastAi)
      ? "Tip: 这更像跟读。试着用自己的话回答问题，并反问一句。"
      : "";
    setTip(echoTip);
    const nextRound = userRound + 1;
    const nextHistory: DatingTurn[] = [...history, { role: "user", text }];
    setHistory(nextHistory);
    setInput("");
    setUserRound(nextRound);
    setRedoUsedThisRound(false);

    if (nextRound >= DATING_SCENE.rounds) {
      setBusy(false);
      await scorePractice(nextHistory);
      return;
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dating_reply",
          round: nextRound,
          history: nextHistory,
        }),
      });
      const data = await res.json();
      const reply = String(data.reply || "Nice — tell me more?");
      const t = String(data.tip || "");
      setHistory((h) => [...h, { role: "ai", text: reply }]);
      setTip(t || echoTip);
      trySpeak(reply);
    } catch {
      setHistory((h) => [
        ...h,
        { role: "ai", text: "Interesting! What else do you enjoy?" },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const redoLast = () => {
    if (redoUsedThisRound || busy || phase !== "chat" || userRound < 1) return;
    // Pop trailing AI (if any) + last user line; put text back for rewrite.
    const copy = [...history];
    if (copy.at(-1)?.role === "ai" && copy.length > 1) copy.pop();
    const lastUser = copy.at(-1);
    if (lastUser?.role !== "user") return;
    copy.pop();
    setHistory(copy);
    setInput(lastUser.text);
    setUserRound((r) => Math.max(0, r - 1));
    setTip("");
    setRedoUsedThisRound(true);
  };

  const onShareMoment = () => {
    if (!score) return;
    if (tier === "guest") {
      openRegister("晒到动态");
      return;
    }
    writeMomentDraft(buildShareMomentText(score), "AI 约会破冰");
    onClose();
    router.push("/moments/compose");
  };

  const onShareMatch = () => {
    if (!score) return;
    if (tier === "guest") {
      openRegister("发给搭子");
      return;
    }
    writeOpenerDraft(buildShareOpenerText(score));
    onClose();
    router.push("/messages?share=1");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center">
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <div className="text-[11px] text-muted">{DATING_SCENE.badge}</div>
            <h2 className="text-base font-semibold">{DATING_SCENE.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-muted"
            aria-label="关闭"
          >
            ✕
          </button>
        </header>

        {phase === "result" && score ? (
          <div className="space-y-4 overflow-y-auto px-4 py-4">
            <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4 text-center">
              <div className="text-3xl">🏅</div>
              <div className="mt-2 text-lg font-bold">通关：{DATING_SCENE.title}</div>
              <div className="mt-1 text-sm text-muted">{score.summary}</div>
              <div className="mt-2 text-sm">
                地道指数 <Stars n={score.stars} />
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
              <Metric label="表达自然度" value={score.naturalness} />
              <Metric label="礼貌分寸" value={score.politeness} />
              <Metric label="暧昧合适度" value={score.vibe} />
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="text-xs text-muted">最佳一句</div>
              <p className="mt-1 text-[15px] font-medium leading-relaxed">
                「{score.bestLine}」
              </p>
              {score.tip ? (
                <p className="mt-2 text-xs leading-relaxed text-muted">{score.tip}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onShareMoment}
              className="btn-grad w-full rounded-2xl py-3.5 text-sm font-semibold"
            >
              一键晒到动态问搭子
            </button>
            <button
              type="button"
              onClick={onShareMatch}
              className="w-full rounded-2xl border border-line bg-surface py-3.5 text-sm font-semibold"
            >
              发送给搭子
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm text-muted"
            >
              稍后再说
            </button>
          </div>
        ) : (
          <>
            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <p className="text-xs leading-relaxed text-muted">
                角色：Alex · 第一次咖啡约会。请用英文回答 / 反问（不是跟读）。共{" "}
                {DATING_SCENE.rounds} 轮 · 可打字或点麦说话。
              </p>
              {history.map((m, i) => (
                <div
                  key={`${i}-${m.text.slice(0, 12)}`}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-accent text-white"
                        : "border border-line bg-surface"
                    }`}
                  >
                    {m.role === "ai" && (
                      <div className="mb-1 text-[10px] font-medium text-muted">Alex</div>
                    )}
                    {m.text}
                  </div>
                </div>
              ))}
              {tip ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  {tip}
                </div>
              ) : null}
              {phase === "scoring" || busy ? (
                <div className="text-center text-xs text-muted">
                  {phase === "scoring" ? "正在评分…" : "Alex 正在回复…"}
                </div>
              ) : null}
            </div>

            {phase === "chat" && (
              <div className="border-t border-line px-3 py-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
                  <span>
                    进度 {Math.min(userRound, DATING_SCENE.rounds)} / {DATING_SCENE.rounds}
                  </span>
                  {userRound > 0 && !redoUsedThisRound ? (
                    <button
                      type="button"
                      className="text-accent disabled:opacity-40"
                      disabled={busy}
                      onClick={redoLast}
                    >
                      换一句再说
                    </button>
                  ) : (
                    <span>
                      {redoUsedThisRound ? "本轮已用过重说" : "每轮可重说 1 次"}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={2}
                    placeholder="用英文回复…"
                    className="min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={toggleListen}
                    disabled={busy}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm disabled:opacity-40 ${
                      listening
                        ? "bg-red-500 text-white"
                        : "border border-line bg-surface"
                    }`}
                    aria-label={listening ? "结束录音" : "开始录音"}
                    title={listening ? "再点一次结束" : "点一下开始说话"}
                  >
                    🎙
                  </button>
                  <button
                    type="button"
                    disabled={busy || !input.trim()}
                    onClick={() => send()}
                    className="btn-grad h-11 shrink-0 rounded-full px-4 text-sm font-semibold disabled:opacity-40"
                  >
                    发送
                  </button>
                  <div className="mt-1.5 text-[10px] text-muted">
                    {listening
                      ? "录音中…说完再点 🎙 结束"
                      : "点 🎙 开始 · 再说完点一次结束（比按住更稳）"}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Rough echo / shadow-reading detector for coaching tips. */
function looksLikeEcho(user: string, ai: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const u = norm(user);
  const a = norm(ai);
  if (!u || !a) return false;
  if (u === a) return true;
  if (a.includes(u) && u.split(" ").length >= 4) return true;
  if (u.includes(a) && a.split(" ").length >= 5) return true;
  const uw = new Set(u.split(" ").filter((w) => w.length > 2));
  const aw = a.split(" ").filter((w) => w.length > 2);
  if (aw.length < 4) return false;
  const overlap = aw.filter((w) => uw.has(w)).length;
  return overlap / aw.length >= 0.72;
}

// Minimal Web Speech typings for browsers that expose them.
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort?(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}
