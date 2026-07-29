/**
 * Daily bilingual cultural topic wall (Feature 3 MVP).
 * Rotates by day-of-year; hot takes are TTS placeholders until real voice comments ship.
 */

export type TopicStanceId = "a" | "b";

export type HotTake = {
  id: string;
  name: string;
  /** US | CN */
  side: "US" | "CN";
  gender: "m" | "f";
  lang: "en" | "zh";
  stance: TopicStanceId;
  text: string;
  /** Mock like count for display */
  likes: number;
};

export type DailyTopic = {
  id: string;
  /** Short tag for Moments, e.g. AA制 */
  hashtag: string;
  topicZh: string;
  topicEn: string;
  /** One-line cultural hint under the title */
  hintZh: string;
  hintEn: string;
  stanceA: { zh: string; en: string };
  stanceB: { zh: string; en: string };
  hotTakes: HotTake[];
};

export const DAILY_TOPIC_PACK: DailyTopic[] = [
  // 1
  { id: "topic-go-dutch", hashtag: "AA制", topicZh: "在美国，初次约会到底该不该 Go Dutch（AA制）？", topicEn: "On a first date in the US, should you go Dutch?", hintZh: "美中约会礼仪差异 · 今日文化热议", hintEn: "US–CN dating etiquette · today's culture take", stanceA: { zh: "应该 AA", en: "Go Dutch" }, stanceB: { zh: "一方请客更自然", en: "One person treats" }, hotTakes: [{ id: "gd-us-1", name: "Jake", side: "US", gender: "m", lang: "en", stance: "a", text: "Going Dutch on a first date is totally normal here. It feels equal, not cheap.", likes: 42 }, { id: "gd-cn-1", name: "小雨", side: "CN", gender: "f", lang: "zh", stance: "b", text: "国内第一次约会男生请客还是挺常见的，AA 容易显得太客气。", likes: 56 }] },
  // 2
  { id: "topic-chigua", hashtag: "吃瓜", topicZh: "在中国，「吃瓜」用英文怎么地道表达？", topicEn: "What's the most natural English for Chinese「吃瓜」?", hintZh: "网络流行语互译 · 今日文化热议", hintEn: "Internet slang across cultures · today's take", stanceA: { zh: "watching the drama / tea", en: "watching the drama / tea" }, stanceB: { zh: "说 being nosy 就够了", en: "just say being nosy" }, hotTakes: [{ id: "cg-us-1", name: "Mia", side: "US", gender: "f", lang: "en", stance: "a", text: "I'd say I'm here for the tea, or just watching the drama unfold.", likes: 67 }, { id: "cg-cn-1", name: "橙子", side: "CN", gender: "f", lang: "zh", stance: "a", text: "直接说 I'm just here for the tea 美区朋友秒懂。", likes: 51 }] },
  // 3
  { id: "topic-la-slang", hashtag: "LA俚语", topicZh: "洛杉矶现在最火的俚语，你会怎么用？", topicEn: "What's the most common slang in LA right now?", hintZh: "美区口语冷知识 · 今日文化热议", hintEn: "US slang cold knowledge · today's take", stanceA: { zh: "多用 down / fire / bet", en: "down / fire / bet" }, stanceB: { zh: "还是说正常英文更安全", en: "plain English is safer" }, hotTakes: [{ id: "la-us-1", name: "Marcus", side: "US", gender: "m", lang: "en", stance: "a", text: "In LA you'll hear bet, down, and that's fire all the time.", likes: 58 }, { id: "la-cn-1", name: "Lynn", side: "CN", gender: "f", lang: "zh", stance: "a", text: "跟朋友聊天时说 That sounds fire，气氛立刻松很多。", likes: 33 }] },
  // 4
  { id: "topic-texting", hashtag: "已读不回", topicZh: "跨国聊天，「已读不回」算不算失礼？", topicEn: "Is leaving someone on read rude across cultures?", hintZh: "沟通节奏差异 · 今日文化热议", hintEn: "Reply-culture clash · today's take", stanceA: { zh: "算失礼，至少回个表情", en: "Rude — at least react" }, stanceB: { zh: "正常，忙起来很常见", en: "Normal when busy" }, hotTakes: [{ id: "tx-us-1", name: "Noah", side: "US", gender: "m", lang: "en", stance: "b", text: "People leave each other on read all the time. Don't overthink it.", likes: 40 }, { id: "tx-cn-1", name: "思思", side: "CN", gender: "f", lang: "zh", stance: "a", text: "国内已读不回容易被解读成态度问题，至少回个「稍后回你」。", likes: 62 }] },
  // 5
  { id: "topic-tipping", hashtag: "小费文化", topicZh: "带中国朋友在美国吃饭，怎么解释小费文化？", topicEn: "How do you explain US tipping culture to a Chinese friend?", hintZh: "生活场景口语 · 今日文化热议", hintEn: "Everyday culture talk · today's take", stanceA: { zh: "先说 15–20% 是默认", en: "Say 15–20% is default" }, stanceB: { zh: "先吐槽再解释更真实", en: "Vent first, then explain" }, hotTakes: [{ id: "tp-us-1", name: "Ethan", side: "US", gender: "m", lang: "en", stance: "a", text: "Servers rely on tips, so 18 to 20 percent is the polite baseline.", likes: 47 }, { id: "tp-cn-1", name: "可可", side: "CN", gender: "f", lang: "zh", stance: "b", text: "我会先吐槽一句「账单后面还要加一截」，再解释为什么。", likes: 53 }] },
  // 6
  { id: "topic-overtime", hashtag: "加班文化", topicZh: "怎么跟美国朋友解释「加班很正常」？", topicEn: "How do you explain Chinese overtime culture to US friends?", hintZh: "职场文化碰撞 · 今日文化热议", hintEn: "Work culture clash · today's take", stanceA: { zh: "强调行业与城市差异", en: "Stress industry differences" }, stanceB: { zh: "直接说卷但正在改变", en: "Say it's intense but shifting" }, hotTakes: [{ id: "ot-us-1", name: "Jordan", side: "US", gender: "m", lang: "en", stance: "a", text: "I'd frame it as some industries expect longer hours, not that everyone does.", likes: 28 }, { id: "ot-cn-1", name: "米粒", side: "CN", gender: "f", lang: "zh", stance: "a", text: "分城市、分行业讲更准确，别一句「中国人都加班」。", likes: 36 }] },
  // 7
  { id: "topic-personal-space", hashtag: "社交距离", topicZh: "美国人聊天为什么站那么远？中国人为什么站那么近？", topicEn: "Why do Americans keep so much personal space in conversation?", hintZh: "身体语言差异 · 今日文化热议", hintEn: "Body language gap · today's take", stanceA: { zh: "远一点更礼貌舒适", en: "Distance = polite" }, stanceB: { zh: "近一点更亲热真诚", en: "Close = warm & genuine" }, hotTakes: [{ id: "ps-us-1", name: "Liam", side: "US", gender: "m", lang: "en", stance: "a", text: "If someone stands too close I reflexively step back. It's not unfriendly — just habit.", likes: 34 }, { id: "ps-cn-1", name: "小鱼", side: "CN", gender: "f", lang: "zh", stance: "b", text: "我觉得站近一点说明关系好，距离太远反而觉得生分。", likes: 45 }] },
  // 8
  { id: "topic-compliment", hashtag: "夸人方式", topicZh: "美国人为什么随口就夸人？中国人该怎么回应？", topicEn: "Why do Americans compliment strangers so easily?", hintZh: "社交礼仪 · 今日文化热议", hintEn: "Social etiquette · today's take", stanceA: { zh: "大方说 Thank you 就好", en: "Just say thank you" }, stanceB: { zh: "谦虚一下更像中国人", en: "Being modest is fine too" }, hotTakes: [{ id: "cm-us-1", name: "Ashley", side: "US", gender: "f", lang: "en", stance: "a", text: "If someone says nice shirt, just say thanks! We don't expect you to deny it.", likes: 55 }, { id: "cm-cn-1", name: "阿圆", side: "CN", gender: "f", lang: "zh", stance: "b", text: "被夸了下意识说「没有没有」其实也挺可爱的，不用强迫自己改。", likes: 39 }] },
  // 9
  { id: "topic-food-sharing", hashtag: "点菜文化", topicZh: "中国人为什么吃饭要一起点菜分着吃？美国人为什么各点各的？", topicEn: "Why do Chinese people share dishes while Americans order individually?", hintZh: "餐桌文化 · 今日文化热议", hintEn: "Dining culture · today's take", stanceA: { zh: "分享更热闹有趣", en: "Sharing is more fun" }, stanceB: { zh: "各点各的更自在", en: "Ordering your own is easier" }, hotTakes: [{ id: "fs-us-1", name: "Mike", side: "US", gender: "m", lang: "en", stance: "b", text: "I like knowing exactly what I'm getting. Sharing can be tricky with allergies.", likes: 31 }, { id: "fs-cn-1", name: "大莉", side: "CN", gender: "f", lang: "zh", stance: "a", text: "一桌菜大家一起吃才有气氛！各吃各的太冷清了。", likes: 60 }] },
  // 10
  { id: "topic-pet-names", hashtag: "称呼方式", topicZh: "美国情侣叫 babe / honey 正常吗？中国人怎么称呼另一半？", topicEn: "Is calling your partner babe/honey normal? What do Chinese couples say?", hintZh: "恋爱用语 · 今日文化热议", hintEn: "Relationship language · today's take", stanceA: { zh: "甜称很自然", en: "Pet names are natural" }, stanceB: { zh: "直接叫名字或昵称", en: "Just use real names" }, hotTakes: [{ id: "pn-us-1", name: "Chris", side: "US", gender: "m", lang: "en", stance: "a", text: "Babe is just what comes out. It's not even a conscious choice honestly.", likes: 44 }, { id: "pn-cn-1", name: "小月", side: "CN", gender: "f", lang: "zh", stance: "b", text: "我们一般叫名字或者「宝」，太西式的甜称说出来会觉得很奇怪。", likes: 48 }] },
  // 11
  { id: "topic-meeting-parents", hashtag: "见家长", topicZh: "在中国，「见家长」意味着什么？美国也这样吗？", topicEn: "In China, meeting the parents is a big deal. Is it the same in the US?", hintZh: "恋爱阶段差异 · 今日文化热议", hintEn: "Relationship milestones · today's take", stanceA: { zh: "见家长 = 很认真了", en: "It's serious" }, stanceB: { zh: "美国比较随意，不一定代表什么", en: "In the US it's more casual" }, hotTakes: [{ id: "mp-us-1", name: "Dylan", side: "US", gender: "m", lang: "en", stance: "b", text: "I've introduced casual girlfriends to my parents. It doesn't always mean marriage.", likes: 37 }, { id: "mp-cn-1", name: "婷婷", side: "CN", gender: "f", lang: "zh", stance: "a", text: "在国内带回家见父母基本就是准备谈婚论嫁了。", likes: 64 }] },
  // 12
  { id: "topic-small-talk", hashtag: "寒暄", topicZh: "美国人的 How are you 到底要不要认真回答？", topicEn: "When Americans say 'How are you?', do they actually want to know?", hintZh: "打招呼礼仪 · 今日文化热议", hintEn: "Greeting etiquette · today's take", stanceA: { zh: "说 Good 就行别认真", en: "Just say Good, don't overthink" }, stanceB: { zh: "偶尔认真回答也没事", en: "A real answer is fine sometimes" }, hotTakes: [{ id: "st-us-1", name: "Brandon", side: "US", gender: "m", lang: "en", stance: "a", text: "99% of the time it's just a greeting. Good, how about you is the full script.", likes: 72 }, { id: "st-cn-1", name: "安安", side: "CN", gender: "f", lang: "zh", stance: "b", text: "我以前会认真回答然后气氛很尴尬…后来才知道就说 Good 就完事了。", likes: 58 }] },
  // 13
  { id: "topic-hug-greeting", hashtag: "拥抱文化", topicZh: "美国人见面就 hug，中国人该怎么应对？", topicEn: "Americans hug when greeting — how should Chinese people react?", hintZh: "肢体礼仪 · 今日文化热议", hintEn: "Physical greeting culture · today's take", stanceA: { zh: "入乡随俗，hug 回去", en: "Hug back — when in Rome" }, stanceB: { zh: "不习惯可以伸手握手", en: "A handshake is fine too" }, hotTakes: [{ id: "hg-us-1", name: "Sam", side: "US", gender: "m", lang: "en", stance: "a", text: "If I go in for a hug and you freeze, no worries. But a hug back is always welcome.", likes: 36 }, { id: "hg-cn-1", name: "菲菲", side: "CN", gender: "f", lang: "zh", stance: "b", text: "第一次被 hug 的时候整个人僵住了…现在习惯了觉得挺温暖的。", likes: 49 }] },
  // 14
  { id: "topic-roommate", hashtag: "合租文化", topicZh: "美国人 30 岁还跟室友合租正常吗？中国人怎么看？", topicEn: "Is it normal for a 30-year-old to have roommates in the US?", hintZh: "生活方式差异 · 今日文化热议", hintEn: "Living arrangements · today's take", stanceA: { zh: "完全正常，大城市都这样", en: "Totally normal in big cities" }, stanceB: { zh: "30 岁了应该独立", en: "Should live alone by 30" }, hotTakes: [{ id: "rm-us-1", name: "Kevin", side: "US", gender: "m", lang: "en", stance: "a", text: "In NYC and SF, roommates at 30 is just economics. Nobody judges.", likes: 52 }, { id: "rm-cn-1", name: "程程", side: "CN", gender: "f", lang: "zh", stance: "b", text: "国内觉得 30 岁还跟别人住有点不太体面，但其实一线城市也越来越多了。", likes: 40 }] },
  // 15
  { id: "topic-dating-apps", hashtag: "交友软件", topicZh: "用交友 App 找对象丢人吗？", topicEn: "Is using dating apps embarrassing or totally normal?", hintZh: "恋爱观碰撞 · 今日文化热议", hintEn: "Modern dating attitudes · today's take", stanceA: { zh: "很正常，效率高", en: "Normal — it's efficient" }, stanceB: { zh: "还是自然认识更好", en: "Organic meeting is better" }, hotTakes: [{ id: "da-us-1", name: "Jason", side: "US", gender: "m", lang: "en", stance: "a", text: "I met my last girlfriend on Hinge. No shame — it's just how things work now.", likes: 55 }, { id: "da-cn-1", name: "晓晓", side: "CN", gender: "f", lang: "zh", stance: "b", text: "我不太好意思跟朋友说在 App 上认识的…虽然其实大家都在用。", likes: 43 }] },
  // 16
  { id: "topic-ghosting", hashtag: "Ghosting", topicZh: "对方突然消失不回消息，中美都这样吗？", topicEn: "Ghosting — is it a universal phenomenon or a US thing?", hintZh: "约会雷区 · 今日文化热议", hintEn: "Dating red flags · today's take", stanceA: { zh: "直接说不合适比消失好", en: "Better to say it than vanish" }, stanceB: { zh: "有时候消失也是一种温柔", en: "Sometimes silence is kinder" }, hotTakes: [{ id: "gh-us-1", name: "Luke", side: "US", gender: "m", lang: "en", stance: "a", text: "Ghosting sucks. A simple 'I'm not feeling it' takes 5 seconds and shows respect.", likes: 61 }, { id: "gh-cn-1", name: "言言", side: "CN", gender: "f", lang: "zh", stance: "b", text: "有时候不想伤害对方，慢慢减少回复可能比直说更温和。", likes: 38 }] },
  // 17
  { id: "topic-emoji", hashtag: "表情包", topicZh: "中国人的表情包 vs 美国人的 emoji，谁更强？", topicEn: "Chinese memes vs American emojis — who wins?", hintZh: "聊天风格对比 · 今日文化热议", hintEn: "Chat culture battle · today's take", stanceA: { zh: "中国表情包更丰富搞笑", en: "Chinese stickers are funnier" }, stanceB: { zh: "emoji 简洁通用更高效", en: "Emojis are universal & efficient" }, hotTakes: [{ id: "em-us-1", name: "Olivia", side: "US", gender: "f", lang: "en", stance: "b", text: "A well-timed 💀 or 😭 says everything. No need for a whole meme.", likes: 42 }, { id: "em-cn-1", name: "豆豆", side: "CN", gender: "f", lang: "zh", stance: "a", text: "中国表情包能表达的情绪太丰富了，一个 emoji 根本不够！", likes: 66 }] },
  // 18
  { id: "topic-parents-money", hashtag: "啃老", topicZh: "毕业后父母帮忙付首付算「啃老」吗？美国人怎么看？", topicEn: "Is parental help with a down payment 'freeloading'?", hintZh: "家庭经济观 · 今日文化热议", hintEn: "Family financial norms · today's take", stanceA: { zh: "这是家庭互助很正常", en: "Family help is normal" }, stanceB: { zh: "应该完全靠自己", en: "Should be fully independent" }, hotTakes: [{ id: "pm-us-1", name: "Daniel", side: "US", gender: "m", lang: "en", stance: "b", text: "Most of my friends wouldn't ask their parents. Independence is a big value here.", likes: 33 }, { id: "pm-cn-1", name: "乐乐", side: "CN", gender: "f", lang: "zh", stance: "a", text: "国内房价太高了，父母帮一把很正常，不算啃老。", likes: 58 }] },
  // 19
  { id: "topic-coffee-tea", hashtag: "咖啡vs茶", topicZh: "为什么美国人离不开咖啡？中国人为什么爱喝茶？", topicEn: "Coffee culture vs tea culture — why the divide?", hintZh: "日常饮品文化 · 今日文化热议", hintEn: "Daily beverage culture · today's take", stanceA: { zh: "咖啡效率高适合快节奏", en: "Coffee fits the fast pace" }, stanceB: { zh: "茶更养生有仪式感", en: "Tea is healthier & ritualistic" }, hotTakes: [{ id: "ct-us-1", name: "Ryan", side: "US", gender: "m", lang: "en", stance: "a", text: "Without my morning coffee I'm basically a zombie. It's survival.", likes: 49 }, { id: "ct-cn-1", name: "清清", side: "CN", gender: "f", lang: "zh", stance: "b", text: "泡一壶茶慢慢喝，整个人都静下来了。咖啡喝多了心慌。", likes: 44 }] },
  // 20
  { id: "topic-marriage-age", hashtag: "婚龄焦虑", topicZh: "25 岁被催婚 vs 美国 30+ 才考虑结婚，哪个更好？", topicEn: "Married by 25 in China vs 30+ in the US — which is healthier?", hintZh: "人生节奏差异 · 今日文化热议", hintEn: "Life timeline differences · today's take", stanceA: { zh: "不用着急，30+ 结婚很好", en: "No rush — 30+ is fine" }, stanceB: { zh: "早点成家也有好处", en: "Settling down early has perks" }, hotTakes: [{ id: "ma-us-1", name: "Tom", side: "US", gender: "m", lang: "en", stance: "a", text: "Most of my friends aren't even thinking about marriage until 30. And that's fine.", likes: 46 }, { id: "ma-cn-1", name: "芳芳", side: "CN", gender: "f", lang: "zh", stance: "b", text: "被催婚压力大，但早点遇到对的人结婚也不是坏事。", likes: 41 }] },
  // 21
  { id: "topic-drinking", hashtag: "酒桌文化", topicZh: "中国的「劝酒」文化，怎么跟美国人解释？", topicEn: "How do you explain China's 'persuasive drinking' culture?", hintZh: "社交场景 · 今日文化热议", hintEn: "Social drinking norms · today's take", stanceA: { zh: "解释为表达热情的方式", en: "Explain it as showing warmth" }, stanceB: { zh: "直说这是陋习正在改变", en: "Admit it's fading" }, hotTakes: [{ id: "dk-us-1", name: "Nick", side: "US", gender: "m", lang: "en", stance: "b", text: "If I say no to a drink, that should be enough. No offense.", likes: 55 }, { id: "dk-cn-1", name: "强哥", side: "CN", gender: "m", lang: "zh", stance: "a", text: "劝酒确实是热情的表现，但年轻人已经不太这样了。", likes: 39 }] },
  // 22
  { id: "topic-direct-vs-indirect", hashtag: "说话方式", topicZh: "美国人说话太直接？中国人说话太含蓄？", topicEn: "Are Americans too direct? Are Chinese too indirect?", hintZh: "沟通风格 · 今日文化热议", hintEn: "Communication styles · today's take", stanceA: { zh: "直接更高效", en: "Direct is more efficient" }, stanceB: { zh: "委婉是尊重", en: "Indirect shows respect" }, hotTakes: [{ id: "di-us-1", name: "James", side: "US", gender: "m", lang: "en", stance: "a", text: "I'd rather someone say no than hint around it. Saves everyone time.", likes: 47 }, { id: "di-cn-1", name: "悦悦", side: "CN", gender: "f", lang: "zh", stance: "b", text: "我觉得留点面子很重要，太直接会让人下不来台。", likes: 52 }] },
  // 23
  { id: "topic-social-media", hashtag: "朋友圈", topicZh: "你会加跨国朋友的社交账号吗？加了之后聊什么？", topicEn: "Would you add a cross-cultural friend on social media? Then what?", hintZh: "社交边界 · 今日文化热议", hintEn: "Social media boundaries · today's take", stanceA: { zh: "加！多一个窗口了解彼此", en: "Add — it's a window into their life" }, stanceB: { zh: "不加，保持神秘感", en: "Don't — keep some mystery" }, hotTakes: [{ id: "sm-us-1", name: "Eric", side: "US", gender: "m", lang: "en", stance: "a", text: "I'd add them on IG. Story replies are a great low-pressure way to chat.", likes: 38 }, { id: "sm-cn-1", name: "琳琳", side: "CN", gender: "f", lang: "zh", stance: "b", text: "朋友圈太私密了，不太想刚认识就给对方看。", likes: 44 }] },
  // 24
  { id: "topic-age-asking", hashtag: "问年龄", topicZh: "为什么美国人不喜欢被问年龄？中国人为什么随口就问？", topicEn: "Why is asking someone's age rude in the US but normal in China?", hintZh: "社交禁忌 · 今日文化热议", hintEn: "Social taboos · today's take", stanceA: { zh: "年龄不敏感随便问", en: "Age isn't sensitive — just ask" }, stanceB: { zh: "尊重对方不主动问", en: "Don't ask unless they share" }, hotTakes: [{ id: "aa-us-1", name: "Sophia", side: "US", gender: "f", lang: "en", stance: "b", text: "I never ask age. If they want me to know, they'll tell me.", likes: 41 }, { id: "aa-cn-1", name: "小北", side: "CN", gender: "m", lang: "zh", stance: "a", text: "国内问年龄就跟问「你吃了吗」一样自然，没有冒犯的意思。", likes: 53 }] },
  // 25
  { id: "topic-leftovers", hashtag: "打包文化", topicZh: "在美国打包剩菜很正常，中国人为什么有时不好意思？", topicEn: "Asking for a to-go box is normal in the US. Why is it awkward in China?", hintZh: "餐桌礼仪 · 今日文化热议", hintEn: "Dining etiquette · today's take", stanceA: { zh: "打包不浪费很正常", en: "Doggy bags prevent waste" }, stanceB: { zh: "有时面子上不太好意思", en: "Can feel awkward with company" }, hotTakes: [{ id: "lf-us-1", name: "Andrew", side: "US", gender: "m", lang: "en", stance: "a", text: "Asking for a box is completely normal. No waiter will judge you.", likes: 48 }, { id: "lf-cn-1", name: "妮妮", side: "CN", gender: "f", lang: "zh", stance: "b", text: "请客的时候打包会不会显得太抠了…不过年轻人现在也不在意了。", likes: 35 }] },
  // 26
  { id: "topic-silence", hashtag: "沉默", topicZh: "聊天时突然沉默，中美两方各会怎么想？", topicEn: "When conversation goes silent — what do each side think?", hintZh: "聊天节奏 · 今日文化热议", hintEn: "Conversation rhythm · today's take", stanceA: { zh: "沉默没关系，不用尬聊", en: "Silence is OK — no filler needed" }, stanceB: { zh: "应该找话题别冷场", en: "Someone should fill the gap" }, hotTakes: [{ id: "si-us-1", name: "Matt", side: "US", gender: "m", lang: "en", stance: "a", text: "Comfortable silence means you vibe. Not every second needs words.", likes: 43 }, { id: "si-cn-1", name: "晨晨", side: "CN", gender: "f", lang: "zh", stance: "b", text: "冷场了我就会紧张，赶紧想下一个话题。", likes: 50 }] },
  // 27
  { id: "topic-sorry", hashtag: "道歉频率", topicZh: "为什么美国人动不动就说 Sorry？中国人说「不好意思」算道歉吗？", topicEn: "Why do Americans say sorry so often? Does 不好意思 count?", hintZh: "语用差异 · 今日文化热议", hintEn: "Pragmatics across languages · today's take", stanceA: { zh: "Sorry 只是礼貌口头禅", en: "Sorry is just politeness" }, stanceB: { zh: "说太多 sorry 反而没诚意", en: "Too many sorrys = insincere" }, hotTakes: [{ id: "so-us-1", name: "Carter", side: "US", gender: "m", lang: "en", stance: "a", text: "I say sorry when I bump into a chair. It's reflex, not remorse.", likes: 56 }, { id: "so-cn-1", name: "小白", side: "CN", gender: "f", lang: "zh", stance: "b", text: "如果每句话都带 sorry，我会觉得到底哪句是真心道歉。", likes: 41 }] },
  // 28
  { id: "topic-gym", hashtag: "健身文化", topicZh: "为什么美国人那么爱去健身房？中国年轻人也在跟风吗？", topicEn: "Why are Americans so into the gym? Is China catching up?", hintZh: "生活方式 · 今日文化热议", hintEn: "Lifestyle trends · today's take", stanceA: { zh: "健身是自律的表现", en: "Gym = self-discipline" }, stanceB: { zh: "不一定非去健身房，跑步散步也行", en: "A walk or run works too" }, hotTakes: [{ id: "gy-us-1", name: "Travis", side: "US", gender: "m", lang: "en", stance: "a", text: "The gym is my therapy. Lifting clears my head better than anything.", likes: 48 }, { id: "gy-cn-1", name: "桃子", side: "CN", gender: "f", lang: "zh", stance: "b", text: "我不太喜欢健身房的氛围，在公园跑步或者跳操就够了。", likes: 37 }] },
  // 29
  { id: "topic-holiday-gifts", hashtag: "送礼文化", topicZh: "美国人圣诞互送礼物 vs 中国人过年发红包，哪种更有心？", topicEn: "Christmas gifts vs Chinese New Year red envelopes — which feels more personal?", hintZh: "节日习俗 · 今日文化热议", hintEn: "Holiday customs · today's take", stanceA: { zh: "选礼物更花心思", en: "Picking a gift shows more thought" }, stanceB: { zh: "红包实在不踩雷", en: "Cash is practical & safe" }, hotTakes: [{ id: "hg2-us-1", name: "Will", side: "US", gender: "m", lang: "en", stance: "a", text: "A thoughtful gift shows you pay attention. Gift cards feel lazy to me.", likes: 39 }, { id: "hg2-cn-1", name: "圆圆", side: "CN", gender: "f", lang: "zh", stance: "b", text: "红包多方便啊！买礼物买错了更尴尬。", likes: 54 }] },
  // 30
  { id: "topic-weather-talk", hashtag: "聊天气", topicZh: "英国人美国人为什么爱聊天气？中国人聊什么开场？", topicEn: "Westerners love weather talk. What's China's default opener?", hintZh: "开场白文化 · 今日文化热议", hintEn: "Conversation starters · today's take", stanceA: { zh: "中国人开场问「吃了吗」更亲切", en: "Chinese ask 'Have you eaten?' = warmer" }, stanceB: { zh: "聊天气更安全不冒犯", en: "Weather is safe & inoffensive" }, hotTakes: [{ id: "wt-us-1", name: "Ben", side: "US", gender: "m", lang: "en", stance: "b", text: "Nice weather today is the ultimate safe opener. Works every time.", likes: 35 }, { id: "wt-cn-1", name: "小薇", side: "CN", gender: "f", lang: "zh", stance: "a", text: "「吃了吗」听起来随意但其实是在表达关心，比聊天气有温度。", likes: 47 }] },
];

export function todaysTopic(now = new Date()): DailyTopic {
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_TOPIC_PACK[day % DAILY_TOPIC_PACK.length];
}

export function hotTakesBySide(topic: DailyTopic, side: "US" | "CN"): HotTake[] {
  return topic.hotTakes.filter((t) => t.side === side);
}

export function buildTopicMomentDraft(
  topic: DailyTopic,
  stance: TopicStanceId,
  locale: "zh" | "en" = "zh"
): string {
  const label =
    stance === "a"
      ? locale === "en"
        ? topic.stanceA.en
        : topic.stanceA.zh
      : locale === "en"
        ? topic.stanceB.en
        : topic.stanceB.zh;
  const q = locale === "en" ? topic.topicEn : topic.topicZh;
  if (locale === "en") {
    return `#Today's topic: ${topic.hashtag}\nTopic: ${q}\nMy take: ${label}\n\n`;
  }
  return `#今日议题：${topic.hashtag}\n议题：${q}\n我的立场：${label}\n\n`;
}

export const TOPIC_MOMENT_TAG = "今日议题";
