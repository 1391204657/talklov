import type { AppLocale } from "@/lib/appCopy";

export const chatCopy = {
  zh: {
    reply: "回复",
    copy: "复制",
    forward: "转发",
    delete: "删除",
    copied: "已复制",
    forwardHint: "已复制消息，请到其他聊天粘贴转发",
    replyTo: "回复",
    cancelReply: "取消",
    deleted: "已删除",
    moreReactions: "更多",
  },
  en: {
    reply: "Reply",
    copy: "Copy",
    forward: "Forward",
    delete: "Delete",
    copied: "Copied",
    forwardHint: "Message copied — paste it in another chat to forward",
    replyTo: "Reply",
    cancelReply: "Cancel",
    deleted: "Deleted",
    moreReactions: "More",
  },
} as const;

export function tChat(locale: AppLocale) {
  return chatCopy[locale === "en" ? "en" : "zh"];
}

export const MESSAGE_REACTIONS = ["❤️", "😂", "😮", "😢", "😠", "👍"] as const;
