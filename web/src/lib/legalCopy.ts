import type { MarketingLocale } from "./marketingCopy";

export type LegalSection = { h: string; p: string };

export const termsSections: Record<MarketingLocale, LegalSection[]> = {
  zh: [
    {
      h: "1. 服务说明",
      p: "TalkLov（talklov.com）提供中美用户之间的语言交换与社交服务。你可以通过浏览、打招呼、聊天等方式使用本平台。部分功能需注册或真人认证后可用。",
    },
    {
      h: "2. 账号与登录方式",
      p: "你可通过邮箱验证码、手机短信验证码，或 Google / Apple 等第三方账号注册与登录。一个手机号仅可绑定一个账号。你有责任妥善保管验证码与设备，不得出借、售卖账号或用于违法用途。",
    },
    {
      h: "3. 用户行为",
      p: "禁止骚扰、欺诈、色情低俗、仇恨言论、冒充他人、传播恶意软件等行为。我们可能限制、暂停或终止违规账号，并配合合法合规要求。",
    },
    {
      h: "4. 内容与隐私",
      p: "你上传的照片与文字应拥有相应权利。我们按隐私政策处理个人信息；真人认证自拍仅用于核验，不会作为公开资料展示。",
    },
    {
      h: "5. 免责声明",
      p: "用户之间的交流由当事人自行判断与负责。TalkLov 尽力提供安全工具，但不保证所有用户行为。涉及金钱转账、线下见面请格外谨慎。",
    },
    {
      h: "6. 条款更新",
      p: "我们可能更新本条款。重大变更将在网站或应用内提示。继续使用即视为接受更新后的条款。",
    },
    {
      h: "7. 联系我们",
      p: "如有疑问，请通过 talklov.com 站点公示的联系方式与我们沟通。（演示站可稍后补全正式邮箱）",
    },
  ],
  en: [
    {
      h: "1. Service",
      p: "TalkLov (talklov.com) provides language exchange and social features for users interested in US–China connections. Some features require registration or selfie verification.",
    },
    {
      h: "2. Accounts & sign-in",
      p: "You may sign up with email OTP, phone SMS OTP, or third-party providers such as Google / Apple. One phone number may bind only one account. Keep your codes and devices secure; do not sell or misuse accounts.",
    },
    {
      h: "3. Conduct",
      p: "Harassment, fraud, explicit content, hate speech, impersonation, and malware are prohibited. We may limit or terminate accounts and comply with lawful requests.",
    },
    {
      h: "4. Content & privacy",
      p: "You must have rights to content you upload. Personal data is handled per our privacy practices. Verification selfies are used for checks only and are not shown as public profile media.",
    },
    {
      h: "5. Disclaimer",
      p: "Conversations between users are their own responsibility. TalkLov provides safety tools but cannot guarantee all behavior. Be careful with money transfers and in-person meetings.",
    },
    {
      h: "6. Updates",
      p: "We may update these Terms. Material changes will be noted on the site or in-app. Continued use means you accept the updated Terms.",
    },
    {
      h: "7. Contact",
      p: "Questions: use the contact channel published on talklov.com (demo site — formal email TBD).",
    },
  ],
};

export const privacySections: Record<MarketingLocale, LegalSection[]> = {
  zh: [
    {
      h: "1. 我们收集什么",
      p: "可能包括：邮箱、手机号、第三方登录标识、资料信息（昵称、年龄、语言、兴趣、照片）、设备与日志信息、聊天与开场白内容（用于提供服务与安全）。",
    },
    {
      h: "2. 如何使用",
      p: "用于账号登录、匹配与展示资料、消息与通知、安全与反诈、改进产品体验。真人认证自拍仅用于核验本人，不作为公开资料展示。",
    },
    {
      h: "3. 共享与披露",
      p: "不会出售你的个人信息。仅在提供服务所必需、经你同意，或法律要求时，才可能向处理商或主管部门披露。",
    },
    {
      h: "4. 存储与安全",
      p: "我们采取合理的技术与管理措施保护数据。跨境场景下可能在美国或中国相关基础设施处理；我们将按适用法律尽力保护。",
    },
    {
      h: "5. 你的选择",
      p: "你可以更新资料、调整照片可见范围、关闭推送通知、申请注销账号。部分功能关闭后可能无法完整使用服务。",
    },
    {
      h: "6. 儿童",
      p: "本服务面向年满 18 岁的用户。我们发现未达年龄用户将采取措施限制或删除。",
    },
    {
      h: "7. 更新与联系",
      p: "本政策可能更新，重大变更会在站点或应用内提示。演示站联系邮箱稍后补全；正式运营后将在 talklov.com 公示。",
    },
  ],
  en: [
    {
      h: "1. What we collect",
      p: "May include email, phone number, third-party sign-in identifiers, profile data (name, age, languages, interests, photos), device/log data, and chat/opener content needed to run the service and keep it safe.",
    },
    {
      h: "2. How we use it",
      p: "Account access, matching and profiles, messaging and notifications, safety/fraud prevention, and product improvement. Verification selfies are for checks only and are not shown as public profile media.",
    },
    {
      h: "3. Sharing",
      p: "We do not sell your personal information. We may share with processors or authorities only as needed to provide the service, with your consent, or as required by law.",
    },
    {
      h: "4. Storage & security",
      p: "We use reasonable technical and organizational measures. For US–China use cases, processing may occur on infrastructure in relevant regions, subject to applicable law.",
    },
    {
      h: "5. Your choices",
      p: "You can update your profile, photo visibility, disable push notifications, and request account deletion. Some features may stop working if disabled.",
    },
    {
      h: "6. Children",
      p: "TalkLov is for users 18+. If we learn a user is underage, we will restrict or delete the account.",
    },
    {
      h: "7. Updates & contact",
      p: "We may update this policy; material changes will be noted on the site or in-app. Formal contact email will be published on talklov.com.",
    },
  ],
};
