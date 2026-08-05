"use client";

import { useCallback, useEffect, useState } from "react";
import { flashCopy, livenessDisplayText } from "@/lib/flashCheck";

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

export default function FlashCheck({
  en,
  onApproved,
  onPending,
  onError,
  onCancel,
}: Props) {
  const t = flashCopy(en);
  const [phase, setPhase] = useState<"loading" | "ready" | "finishing">(
    "loading"
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [region, setRegion] = useState("us-east-1");
  const [creds, setCreds] = useState<Creds | null>(null);
  const [Detector, setDetector] = useState<React.ComponentType<{
    sessionId: string;
    region: string;
    onAnalysisComplete: () => Promise<void>;
    onError: (err: { state?: string; error?: Error }) => void;
    displayText?: Record<string, string>;
    config: {
      credentialProvider: () => Promise<{
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
      }>;
    };
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@aws-amplify/ui-react-liveness");
        await import("@aws-amplify/ui-react/styles.css");
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
          onError(
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
  }, [en, onError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/verify/liveness/session", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.failed);
        if (cancelled) return;
        setSessionId(data.sessionId);
        setRegion(data.region || "us-east-1");
        setCreds(data.credentials);
        setPhase("ready");
      } catch (e) {
        if (!cancelled) {
          onError(e instanceof Error ? e.message : t.failed);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError, t.failed]);

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
    setPhase("finishing");
    try {
      const res = await fetch("/api/verify/liveness/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.failed);
      if (data.outcome === "approved" || data.outcome === "already_verified") {
        onApproved();
      } else if (data.outcome === "pending" || data.outcome === "duplicate") {
        onPending();
      } else {
        onError(t.failed);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : t.failed);
    }
  }, [sessionId, onApproved, onPending, onError, t.failed]);

  if (phase === "loading" || !Detector || !sessionId || !creds) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-4">
        <p className="text-sm text-muted">{t.submitting}</p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm text-muted"
        >
          {en ? "Cancel" : "取消"}
        </button>
      </div>
    );
  }

  if (phase === "finishing") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <p className="text-sm text-muted">{t.submitting}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <p className="text-sm font-medium">{en ? "Flash Check" : "真人闪验"}</p>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 text-sm text-muted"
        >
          {en ? "Close" : "关闭"}
        </button>
      </div>
      {/* Full-height detector so Start is above the fold on iPhone */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl [&_.amplify-liveness-start-screen]:pb-8">
        <Detector
          sessionId={sessionId}
          region={region}
          displayText={livenessDisplayText(en) as Record<string, string>}
          onAnalysisComplete={onAnalysisComplete}
          onError={(err) => {
            onError(err.error?.message || t.needCamera);
          }}
          config={{ credentialProvider }}
        />
      </div>
    </div>
  );
}
