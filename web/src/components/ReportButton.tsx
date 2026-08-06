"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { submitReport, type ReportReason } from "@/lib/moderation";

const REASONS: { id: ReportReason; zh: string; en: string }[] = [
  { id: "spam", zh: "垃圾广告", en: "Spam" },
  { id: "harassment", zh: "骚扰辱骂", en: "Harassment" },
  { id: "scam", zh: "诈骗 / 索要钱财", en: "Scam" },
  { id: "sexual", zh: "色情不当", en: "Sexual content" },
  { id: "underage", zh: "疑似未成年", en: "Underage" },
  { id: "fake", zh: "虚假资料", en: "Fake profile" },
  { id: "other", zh: "其他", en: "Other" },
];

type Props = {
  targetId: string;
  targetName?: string;
  conversationId?: string | null;
  className?: string;
};

export default function ReportButton({
  targetId,
  targetName,
  conversationId,
  className = "",
}: Props) {
  const { userId, locale, openRegister, isBanned } = useApp();
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!targetId || targetId === userId || targetId === "me") return null;

  const onOpen = () => {
    if (!userId) {
      openRegister(en ? "Report user" : "举报用户", targetId);
      return;
    }
    if (isBanned) return;
    setOpen(true);
    setDone(false);
    setErr(null);
  };

  const onSubmit = async () => {
    setBusy(true);
    setErr(null);
    const res = await submitReport({
      targetId,
      reason,
      details,
      conversationId,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setDone(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className={`text-xs text-muted underline-offset-2 hover:underline ${className}`}
      >
        {en ? "Report" : "举报"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">
                  {en ? "Report user" : "举报用户"}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  {targetName || targetId.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted"
              >
                ✕
              </button>
            </div>

            {done ? (
              <p className="mt-4 text-sm text-success">
                {en
                  ? "Thanks — our team will review this report."
                  : "已提交，我们会尽快审核。"}
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setReason(r.id)}
                      className={`rounded-full px-3 py-1 text-xs ${
                        reason === r.id
                          ? "bg-accent/15 font-medium text-accent"
                          : "border border-line text-muted"
                      }`}
                    >
                      {en ? r.en : r.zh}
                    </button>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder={
                    en ? "Optional details…" : "补充说明（可选）…"
                  }
                  className="mt-3 w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                {err && (
                  <p className="mt-2 text-xs text-danger">{err}</p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSubmit()}
                  className="btn-grad mt-3 w-full rounded-2xl py-3 font-semibold disabled:opacity-50"
                >
                  {busy ? "…" : en ? "Submit report" : "提交举报"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
