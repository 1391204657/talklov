/** Messenger-style chat safety tips for money / contact / immigration risk. */

export type SafetyKind =
  | "money"
  | "contact"
  | "immigration"
  | "crypto"
  | "offplatform";

export type SafetyHit = {
  kinds: SafetyKind[];
  /** matched labels for UI chips */
  labels: string[];
};

const RULES: { kind: SafetyKind; label: string; test: (t: string) => boolean }[] =
  [
    {
      kind: "money",
      label: "转账/汇款",
      test: (t) =>
        /转账|汇款|打钱|打款|给.*钱|收钱|付款|收款|银行卡|银行账户|开户|wire\s*transfer|\bwire\b|\bach\b|银行转账/.test(
          t
        ),
    },
    {
      kind: "money",
      label: "投资理财",
      test: (t) =>
        /投资|理财|稳赚|高回报|股票内幕|基金推荐|\binvest(ment|ing)?\b|\broi\b/.test(
          t
        ),
    },
    {
      kind: "money",
      label: "Zelle / PayPal / Venmo",
      test: (t) =>
        /\bzelle\b|\bpaypal\b|\bvenmo\b|\bcash\s*app\b|支付宝转账|微信红包|微信转账/.test(
          t
        ),
    },
    {
      kind: "crypto",
      label: "加密货币",
      test: (t) =>
        /比特币|以太坊|\bbitcoin\b|\bbtc\b|\beth\b|\busdt\b|\bcrypto\b|虚拟货币|钱包地址/.test(
          t
        ),
    },
    {
      kind: "contact",
      label: "电话号码",
      test: (t) => {
        // +1 / +86 / bare 10–11 digit phone-ish (avoid years like 2024 alone)
        if (/\+?\d[\d\s\-()]{8,}\d/.test(t)) return true;
        if (/(?:电话|手机|号码|call\s*me|my\s*number|text\s*me).{0,12}\d{7,}/i.test(t))
          return true;
        return false;
      },
    },
    {
      kind: "contact",
      label: "站外联系",
      test: (t) =>
        /加我微信|加微信|微信号|whatsapp|telegram|\bwechat\b|加我v|加我V|line\s*加我/.test(
          t
        ),
    },
    {
      kind: "immigration",
      label: "绿卡/移民",
      test: (t) =>
        /绿卡|永居|移民|办签证|工作签|结婚签|\bgreen\s*card\b|\bvisa\b|身份办理|公民申请/.test(
          t
        ),
    },
    {
      kind: "offplatform",
      label: "验证码/账号",
      test: (t) => /验证码|验证码发给|把密码|账号密码|\botp\b/.test(t),
    },
  ];

export function scanSafetyTip(text: string): SafetyHit | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  const kinds = new Set<SafetyKind>();
  const labels: string[] = [];
  for (const rule of RULES) {
    if (rule.test(t)) {
      kinds.add(rule.kind);
      if (!labels.includes(rule.label)) labels.push(rule.label);
    }
  }
  if (!kinds.size) return null;
  return { kinds: [...kinds], labels };
}

export function safetyTipCopy(hit: SafetyHit): {
  title: string;
  body: string;
} {
  const hasMoney =
    hit.kinds.includes("money") || hit.kinds.includes("crypto");
  const hasContact = hit.kinds.includes("contact");
  const hasImm = hit.kinds.includes("immigration");

  if (hasMoney && hasContact) {
    return {
      title: "安全提示",
      body: "这条消息涉及金钱或联系方式。真正的朋友不会在刚认识时就要你转账、投资或加站外账号。请先在平台内多了解对方。",
    };
  }
  if (hasMoney) {
    return {
      title: "涉及金钱，请谨慎",
      body: "转账、投资、Zelle / PayPal、加密货币相关请求在交友场景中几乎都是诈骗。TalkLov 不会要求你付款，也不处理站外转账。",
    };
  }
  if (hasImm) {
    return {
      title: "移民/绿卡相关提醒",
      body: "请勿轻信「帮忙办绿卡 / 签证」的私下承诺。正规移民事务请通过官方渠道，不要向陌生人支付费用或分享敏感证件。",
    };
  }
  if (hasContact) {
    return {
      title: "分享联系方式前想一想",
      body: "电话号码、微信、WhatsApp 等会离开平台保护。建议先充分聊天、完成真人认证后再交换站外联系方式。",
    };
  }
  return {
    title: "安全提示",
    body: "这条消息可能涉及敏感信息。请保护好个人隐私与财产，遇到可疑请求请拒绝并举报。",
  };
}
