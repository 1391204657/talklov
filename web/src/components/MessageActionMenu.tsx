"use client";

import { useEffect } from "react";
import type { ChatMessage } from "@/lib/types";
import { MESSAGE_REACTIONS, tChat } from "@/lib/chatCopy";
import type { AppLocale } from "@/lib/appCopy";

export type MessageAction = "reply" | "copy" | "forward" | "delete";

type Props = {
  message: ChatMessage;
  locale: AppLocale;
  onClose: () => void;
  onAction: (action: MessageAction) => void;
  onReact: (emoji: string) => void;
};

export default function MessageActionMenu({
  message,
  locale,
  onClose,
  onAction,
  onReact,
}: Props) {
  const c = tChat(locale);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview =
    message.kind === "image"
      ? locale === "en"
        ? "[Photo]"
        : "[图片]"
      : message.kind === "video"
        ? locale === "en"
          ? "[Video]"
          : "[视频]"
        : message.kind === "voice"
          ? locale === "en"
            ? `[Voice ${message.durationSec ?? ""}″]`
            : `[语音 ${message.durationSec ?? ""}″]`
          : message.text;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-[13.5rem] max-w-[calc(100vw-3rem)] flex-col items-stretch gap-2">
        {/* Reactions */}
        <div className="mx-auto flex items-center gap-0.5 rounded-full bg-background px-1.5 py-1 shadow-lg ring-1 ring-black/5">
          {MESSAGE_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] transition active:scale-110"
              onClick={() => onReact(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Message preview bubble */}
        <div className="max-h-24 overflow-hidden rounded-2xl rounded-bl-md bg-surface-2 px-2.5 py-2 text-[14px] leading-snug text-foreground shadow-md">
          <p className="line-clamp-3 whitespace-pre-wrap break-words">
            {preview}
          </p>
        </div>

        {/* Actions — compact Messenger-sized sheet */}
        <div className="overflow-hidden rounded-xl bg-background shadow-lg ring-1 ring-black/5">
          {(
            [
              { id: "reply" as const, label: c.reply, icon: ReplyIcon, danger: false },
              { id: "copy" as const, label: c.copy, icon: CopyIcon, danger: false },
              { id: "forward" as const, label: c.forward, icon: ForwardIcon, danger: false },
              { id: "delete" as const, label: c.delete, icon: DeleteIcon, danger: true },
            ] as const
          ).map((item, i, arr) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAction(item.id)}
              className={`flex w-full items-center justify-between px-3 py-2.5 text-[15px] leading-none active:bg-surface-2 ${
                item.danger ? "text-danger" : "text-foreground"
              } ${i < arr.length - 1 ? "border-b border-line/60" : ""}`}
            >
              <span>{item.label}</span>
              <item.icon className={item.danger ? "text-danger" : "text-muted"} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${className || ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
      <path d="M12 3l5 4-5 4V3Z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${className || ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function ForwardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${className || ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h10" />
      <path d="M9 5l6 5-6 5" />
    </svg>
  );
}

function DeleteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${className || ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h12M8 6V4h4v2M7 6l.6 10h4.8L13 6" />
    </svg>
  );
}
