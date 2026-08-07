"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeProvider } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import {
  flashCopy,
  livenessDisplayText,
  localizeVerifyError,
} from "@/lib/flashCheck";

type Creds = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
};

type Props = {
  en: boolean;
  onApproved: () => void;
  onPending: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
};

type DetectorProps = {
  sessionId: string;
  region: string;
  onAnalysisComplete: () => Promise<void>;
  onError: (err: { state?: string; error?: Error }) => void;
  onUserCancel?: () => void;
  displayText?: Record<string, string>;
  config: {
    credentialProvider: () => Promise<{
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    }>;
  };
};

/** Stall timeout after face is in frame but AWS stream never progresses. */
const STALL_MS = 45_000;

export default function FlashCheck({
  en,
  onApproved,
  onPending,
  onError,
  onCancel,
}: Props) {
  const t = flashCopy(en);
  const onApprovedRef = useRef(onApproved);
  const onPendingRef = useRef(onPending);
  const onErrorRef = useRef(onError);
  const onCancelRef = useRef(onCancel);
  onApprovedRef.current = onApproved;
  onPendingRef.current = onPending;
  onErrorRef.current = onError;
  onCancelRef.current = onCancel;

  const [phase, setPhase] = useState<"loading" | "ready" | "finishing" | "stalled">(
    "loading"
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [region, setRegion] = useState("us-east-1");
  const [creds, setCreds] = useState<Creds | null>(null);
  const [hint, setHint] = useState(
    en ? "Preparing camera…" : "正在准备摄像头…"
  );
  const [Detector, setDetector] = useState<React.ComponentType<DetectorProps> | null>(
    null
  );
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStallTimer = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  const armStallTimer = useCallback(() => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => {
      setPhase((p) => (p === "ready" ? "stalled" : p));
    }, STALL_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@aws-amplify/ui-react-liveness");
        if (!cancelled) {
          setDetector(
            () =>
              mod.FaceLivenessDetectorCore as unknown as NonNullable<
                typeof Detector
              >
          );
        }
      } catch (e) {
        if (!cancelled) {
          onErrorRef.current(
            e instanceof Error
              ? e.message
              : en
                ? "Could not load Flash Check UI"
                : "无法加载闪验界面"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [en]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setHint(en ? "Starting Flash Check…" : "正在启动闪验…");
        const res = await fetch("/api/verify/liveness/session", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            localizeVerifyError(data.error || "", en) || t.failed
          );
        }
        if (cancelled) return;
        setSessionId(data.sessionId);
        setRegion(data.region || "us-east-1");
        setCreds(data.credentials);
        setHint(
          en
            ? "Center your face in the oval and hold still."
            : "把脸放进圆框并保持不动。"
        );
        setPhase("ready");
        armStallTimer();
      } catch (e) {
        if (!cancelled) {
          onErrorRef.current(e instanceof Error ? e.message : t.failed);
        }
      }
    })();
    return () => {
      cancelled = true;
      clearStallTimer();
    };
  }, [en, t.failed, armStallTimer]);

  const credentialProvider = useCallback(async () => {
    if (!creds) throw new Error("No credentials");
    return {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    };
  }, [creds]);

  const onAnalysisComplete = useCallback(async () => {
    if (!sessionId) return;
    clearStallTimer();
    setPhase("finishing");
    setHint(t.submitting);
    try {
      const res = await fetch("/api/verify/liveness/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.failed);
      if (data.outcome === "approved" || data.outcome === "already_verified") {
        onApprovedRef.current();
      } else if (data.outcome === "pending" || data.outcome === "duplicate") {
        onPendingRef.current();
      } else {
        onErrorRef.current(t.failed);
      }
    } catch (e) {
      onErrorRef.current(e instanceof Error ? e.message : t.failed);
    }
  }, [sessionId, t.failed, t.submitting]);

  const handleDetectorError = useCallback(
    (err: { state?: string; error?: Error }) => {
      clearStallTimer();
      const state = err.state || "";
      const msg = err.error?.message || "";
      const detail = [state, msg].filter(Boolean).join(": ");
      console.warn("[FlashCheck] detector error", err);
      onErrorRef.current(
        localizeVerifyError(detail, en) ||
          detail ||
          t.needCamera
      );
    },
    [en, t.needCamera]
  );

  const retrySession = () => {
    clearStallTimer();
    setPhase("loading");
    setSessionId(null);
    setCreds(null);
    setHint(en ? "Restarting…" : "正在重试…");
    // Remount by clearing session; effect deps don't re-fire — kick manually
    void (async () => {
      try {
        const res = await fetch("/api/verify/liveness/session", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            localizeVerifyError(data.error || "", en) || t.failed
          );
        }
        setSessionId(data.sessionId);
        setRegion(data.region || "us-east-1");
        setCreds(data.credentials);
        setHint(
          en
            ? "Center your face in the oval and hold still."
            : "把脸放进圆框并保持不动。"
        );
        setPhase("ready");
        armStallTimer();
      } catch (e) {
        onErrorRef.current(e instanceof Error ? e.message : t.failed);
      }
    })();
  };

  if (phase === "loading" || !Detector || !sessionId || !creds) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-4">
        <p className="text-sm text-muted">{hint || t.submitting}</p>
        <button
          type="button"
          onClick={() => onCancelRef.current()}
          className="rounded-xl px-4 py-2 text-sm text-muted"
        >
          {en ? "Cancel" : "取消"}
        </button>
      </div>
    );
  }

  if (phase === "finishing") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-4">
        <p className="text-sm font-medium text-foreground">{t.submitting}</p>
        <p className="text-xs text-muted">
          {en ? "Please wait a moment…" : "请稍候，正在确认结果…"}
        </p>
      </div>
    );
  }

  if (phase === "stalled") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm font-medium">
          {en
            ? "No response after face detected"
            : "已检测到面部，但长时间没有下一步反馈"}
        </p>
        <p className="max-w-xs text-xs text-muted">
          {en
            ? "Usually a network or camera stream issue. Retry in better light, or use selfie upload."
            : "多半是网络或摄像头推流异常。请换个光线充足的环境重试，或改用自拍上传。"}
        </p>
        <button
          type="button"
          onClick={retrySession}
          className="btn-grad w-full max-w-xs rounded-xl py-3 text-sm font-semibold"
        >
          {en ? "Try again" : "再试一次"}
        </button>
        <button
          type="button"
          onClick={() => onCancelRef.current()}
          className="text-sm text-muted"
        >
          {en ? "Use selfie upload instead" : "改用自拍上传"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[min(92dvh,820px)] flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {en ? "Flash Check" : "真人闪验"}
          </p>
          <p className="truncate text-xs text-muted">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => onCancelRef.current()}
          className="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface-2"
        >
          {en ? "Close" : "关闭"}
        </button>
      </div>
      {/* No overflow-hidden here — Amplify hints use fixed/absolute overlays */}
      <div className="relative min-h-0 flex-1 overflow-visible bg-black">
        <ThemeProvider>
          <Detector
            sessionId={sessionId}
            region={region}
            displayText={livenessDisplayText(en) as Record<string, string>}
            onAnalysisComplete={onAnalysisComplete}
            onError={handleDetectorError}
            onUserCancel={() => onCancelRef.current()}
            config={{ credentialProvider }}
          />
        </ThemeProvider>
      </div>
    </div>
  );
}
