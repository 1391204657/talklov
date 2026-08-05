import type { Profile } from "./types";

/** Moment media — video reserved for a later release. */
export type MomentMedia =
  | { type: "image"; url: string; alt?: string }
  | { type: "video"; url: string; poster?: string; alt?: string };

export type MomentCorrection = {
  by: string;
  text: string;
};

export type MomentComment = {
  by: string;
  text: string;
};

export type MomentPost = {
  id: string;
  authorId: string;
  time: string;
  text: string;
  media: MomentMedia[];
  likes: number;
  /** Seed comment count (display baseline; real list may be shorter for demo). */
  comments: number;
  /** Seed comments shown under the post */
  seedComments: MomentComment[];
  /** Seed corrections shown under the post */
  corrections: MomentCorrection[];
};

/**
 * 10 distinct demo posts for the Moments tab.
 * Images reuse profile avatars / gallery shots; video slots are typed but unused for now.
 */
export const momentPosts: MomentPost[] = [
  {
    id: "mp1",
    authorId: "lin",
    time: "38 分钟前",
    text: "今天第一次用英语点了咖啡，店员居然听懂了！求纠错：\n“Can I get a oat milk latte, less sweet?”",
    media: [
      { type: "image", url: "/avatars/lin-2.jpg", alt: "咖啡店" },
      { type: "image", url: "/avatars/lin-3.jpg", alt: "拿铁" },
    ],
    likes: 24,
    comments: 8,
    seedComments: [
      { by: "mei", text: "太勇了！下次我也试试用英语点单 ☕" },
      { by: "ryan", text: "Nice try — barista understood you, that counts!" },
    ],
    corrections: [
      { by: "jack", text: "a → an（an oat milk latte）" },
    ],
  },
  {
    id: "mp2",
    authorId: "jack",
    time: "1 小时前",
    text: "学了一个新词：“接地气”。My Chinese teacher says it means down-to-earth. 用对了吗？😄\n今天去了菜市场，感觉自己终于有点接地气了。",
    media: [{ type: "image", url: "/avatars/jack-2.jpg", alt: "菜市场" }],
    likes: 41,
    comments: 15,
    seedComments: [
      { by: "lin", text: "用得很棒！菜市场那句特别有画面感。" },
    ],
    corrections: [
      { by: "shan", text: "用法对！也可以说「他说话很接地气」。" },
    ],
  },
  {
    id: "mp3",
    authorId: "shan",
    time: "2 小时前",
    text: "广州早茶約嗎？想认识喜欢美食的外国朋友一起练英语～ 🥟\nAnyone free this Sunday for dim sum + English practice?",
    media: [
      { type: "image", url: "/avatars/shan-2.jpg", alt: "早茶" },
      { type: "image", url: "/avatars/shan-3.jpg", alt: "点心" },
    ],
    likes: 33,
    comments: 12,
    seedComments: [
      { by: "diego", text: "I'm in if there's xiaolongbao adjacent food 😂" },
      { by: "emma", text: "Sunday works for me — DM?" },
    ],
    corrections: [],
  },
  {
    id: "mp4",
    authorId: "mei",
    time: "3 小时前",
    text: "练口语打卡 Day 12：今天跟语伴聊了宠物话题。\nI said “My cat is very lovely” — 有没有更自然的说法？",
    media: [{ type: "image", url: "/avatars/mei-2.jpg", alt: "猫咪" }],
    likes: 19,
    comments: 6,
    seedComments: [
      { by: "yuki", text: "打卡加油！猫好可爱～" },
    ],
    corrections: [
      { by: "ryan", text: "更自然可以说 “My cat is adorable / such a sweetheart.”" },
    ],
  },
  {
    id: "mp5",
    authorId: "ryan",
    time: "5 小时前",
    text: "Tried writing a WeChat moment in Chinese 🙈\n「今天天气很好，我想去公园跑步和听播客。」\nPlease roast my grammar gently.",
    media: [{ type: "image", url: "/avatars/ryan-2.jpg", alt: "公园跑步" }],
    likes: 56,
    comments: 21,
    seedComments: [
      { by: "jack", text: "Looks solid already. Keep posting in Chinese!" },
      { by: "wen", text: "写得清楚，比很多中国人朋友圈还认真哈哈" },
    ],
    corrections: [
      { by: "lin", text: "很通顺！「听播客」也可以说「边跑步边听播客」。" },
    ],
  },
  {
    id: "mp6",
    authorId: "yuki",
    time: "昨天",
    text: "上海周末雨好多… 宅家看剧学英语。推荐一部对话清晰、适合练听的剧吗？\nPrefer something lighter than crime shows 🌧️",
    media: [{ type: "image", url: "/avatars/yuki-2.jpg", alt: "雨天窗景" }],
    likes: 28,
    comments: 17,
    seedComments: [
      { by: "ashley", text: "Try The Good Place — clear dialogue, not too dark." },
      { by: "mei", text: "我也在看 Friends，语速适中！" },
    ],
    corrections: [],
  },
  {
    id: "mp7",
    authorId: "diego",
    time: "昨天",
    text: "Just ordered xiaolongbao for the first time. The soup exploded everywhere 😂\nHow do you politely ask for “extra vinegar” in Mandarin?",
    media: [{ type: "image", url: "/avatars/diego-1.jpg", alt: "小笼包" }],
    likes: 72,
    comments: 29,
    seedComments: [
      { by: "shan", text: "经典初体验哈哈，下次先咬个小口～" },
    ],
    corrections: [
      { by: "wen", text: "可以说「麻烦多给一点醋，谢谢」。" },
    ],
  },
  {
    id: "mp8",
    authorId: "wen",
    time: "2 天前",
    text: "同事教我一句口语：“没毛病”。我回了 “No problem”……\n是不是完全理解错了？求母语者科普 🙏",
    media: [{ type: "image", url: "/avatars/wen-1.jpg", alt: "办公室白板" }],
    likes: 45,
    comments: 18,
    seedComments: [
      { by: "hao", text: "哈哈我也踩过这个坑" },
    ],
    corrections: [
      {
        by: "marcus",
        text: "“没毛病” ≈ “sounds right / fair enough”，不是 “No problem”。",
      },
    ],
  },
  {
    id: "mp9",
    authorId: "emma",
    time: "2 天前",
    text: "Language exchange tip that worked for me: 10 minutes Chinese → 10 minutes English, no mixing mid-sentence.\n有人也这样练吗？想找固定搭档～",
    media: [
      { type: "image", url: "/avatars/emma-1.jpg", alt: "笔记本计划" },
      { type: "image", url: "/avatars/ashley-1.jpg", alt: "语伴咖啡" },
    ],
    likes: 61,
    comments: 24,
    seedComments: [
      { by: "marcus", text: "Same method here. Happy to try a weekly slot." },
      { by: "lin", text: "这个方法超好用，我也在找固定搭档！" },
    ],
    corrections: [],
  },
  {
    id: "mp10",
    authorId: "hao",
    time: "3 天前",
    text: "第一次用英语开线上会议，紧张到手抖。\n事后复盘：I keep saying “I think maybe…” too much. 有没有更自信的替换？",
    media: [{ type: "image", url: "/avatars/hao-1.jpg", alt: "线上会议" }],
    likes: 37,
    comments: 11,
    seedComments: [
      { by: "chen", text: "第一次就敢开，已经很厉害了！" },
    ],
    corrections: [
      {
        by: "jake",
        text: "试试 “I’d suggest…” / “From my side…” — 听起来更果断。",
      },
    ],
  },
];

export function authorOf(
  authorId: string,
  list: Profile[]
): Profile | undefined {
  return list.find((p) => p.id === authorId);
}
