"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminLocale = "zh" | "en";

const STORAGE_KEY = "talklov_admin_locale";

const copy = {
  zh: {
    brand: "TalkLov 后台",
    overview: "总览",
    users: "用户",
    reports: "举报",
    verifications: "认证审核",
    audit: "审计",
    affiliates: "联盟",
    signOut: "退出",
    checking: "正在验证管理员权限…",
    langZh: "中文",
    langEn: "EN",

    loginTitle: "TalkLov 后台",
    loginHint: "使用管理员邮箱登录",
    email: "邮箱",
    password: "密码",
    confirmPassword: "确认密码",
    signIn: "登录",
    createAccount: "创建管理员账号",
    forgot: "忘记密码？发送重置邮件 →",
    loginNoSignup: "管理员账号请在 Supabase Auth 由负责人创建，此处仅登录。",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",

    overviewTitle: "总览",
    overviewSub: "来自 Supabase 的实时统计（service role）。",
    loadStatsFail: "加载统计失败",
    statUsers: "用户总数",
    statNew24h: "新增（24小时）",
    statVip: "VIP / Founder",
    statFounders: "Founder 人数",
    statFavorites: "收藏总数",
    statViews24h: "主页浏览（24小时）",
    statPurchases7d: "付费订单（7天）",
    statAffiliates: "联盟渠道",
    statOpenReports: "待处理举报",
    statPendingVerify: "待审核认证",

    verifyTitle: "闪验审核",
    verifySub: "对比闪验截图与资料照片；高分可自动通过，其余人工复核。",
    verifyPending: "待审核",
    verifyApproved: "已通过",
    verifyRejected: "已驳回",
    verifyAll: "全部",
    verifyEmpty: "暂无认证申请。",
    verifySelfie: "提交自拍",
    verifyProfilePhotos: "资料照片",
    verifyApprove: "通过",
    verifyReject: "驳回",
    verifyApproveConfirm: "确认通过该用户的真人认证？",
    verifyRejectPrompt: "驳回原因（用户可见）：",
    verifyRejectNeedNote: "驳回必须填写原因。",
    adminNote: "备注",
    reportNotePrompt: "处理备注（必填）：",
    reportNoteRequired: "结案/驳回必须填写备注。",
    viewChat: "查看关联聊天",
    confirmVip: "确认授予 VIP？",
    confirmClearVip: "确认取消 VIP？",
    confirmVerify: "确认手动设为已认证？",
    confirmUnverify: "确认取消认证？",

    usersTitle: "用户",
    usersSub: "按昵称、handle 或 UUID 搜索；可授予 VIP / Founder / 认证。",
    searchPlaceholder: "搜索昵称 / handle / uuid",
    search: "搜索",
    loading: "加载中…",
    noUsers: "没有找到用户。",
    noEmail: "无邮箱",
    plan: "套餐",
    verified: "已认证",
    online: "在线",
    ref: "推荐码",
    vip30: "VIP 30天",
    vip90: "VIP 90天",
    clearVip: "取消 VIP",
    founder: "Founder",
    verify: "设为认证",
    unverify: "取消认证",
    founderConfirm: "确认授予该用户 Founder 名额？",
    actionFail: "操作失败",
    region: "地区",
    phone: "手机号",
    detail: "详情",
    behavior: "行为摘要",
    favOut: "收藏别人",
    favIn: "被收藏",
    viewOut: "看过别人",
    viewIn: "被看过",
    helloSent: "发出打招呼",
    helloRecv: "收到打招呼",
    chats: "会话数",
    purchases: "付费次数",
    backToUsers: "← 用户列表",
    noPhone: "未绑定手机",
    searchPhoneHint: "也可搜手机号 / 城市",
    chatsTitle: "会话与聊天",
    momentsTitle: "用户动态",
    momentsEmpty: "该用户还没有发布动态（需已跑 migrate_moments.sql）。",
    momentsCount: "动态数",
    chatsEmpty: "暂无会话记录。",
    openChat: "查看记录",
    closeChat: "关闭",
    withPeer: "与",
    msgCount: "条消息",
    icebreaker: "开场白",
    status: "状态",
    voiceMsg: "[语音]",
    flagged: "已标记",
    chatAuditHint: "打开聊天记录会写入管理员审计日志。",
    loadChatFail: "加载聊天失败",
    asInitiator: "主动发起",
    asRecipient: "被动接收",
    ban: "封禁",
    unban: "解除封禁",
    banned: "已封禁",
    banReasonPrompt: "封禁原因（用户可见）：",
    unbanConfirm: "确认解除该用户封禁？",
    reportsTitle: "举报工单",
    reportsSub: "用户提交的举报；可标记处理中 / 已解决 / 驳回。",
    reportOpen: "待处理",
    reportReviewing: "处理中",
    reportResolved: "已解决",
    reportDismissed: "已驳回",
    reportAll: "全部",
    reporter: "举报人",
    target: "被举报人",
    reason: "原因",
    markReviewing: "标为处理中",
    markResolved: "标为已解决",
    markDismissed: "驳回",
    noReports: "暂无举报。",
    viewTarget: "查看用户",
    banAndResolve: "封禁并结案",
    banAndResolveConfirm: "封禁该用户并将本工单标为已解决？",
    auditTitle: "审计日志",
    auditSub: "管理员查看资料/聊天、封禁、授权等操作记录。",
    auditSearchPlaceholder: "搜管理员邮箱 / 动作 / 用户 UUID",
    auditAllActions: "全部动作",
    auditEmpty: "暂无审计记录（需已跑 privacy 迁移建表）。",
    auditWhen: "时间",
    auditAdmin: "管理员",
    auditAction: "动作",
    auditViewUser: "查看用户详情",
    auditListChats: "列出会话",
    auditViewChat: "查看聊天记录",
    affiliatesTitle: "联盟渠道",
    affiliatesSub: "KOL / 渠道码、邀请人数与佣金概况。",
    affiliatesHint: "分享链接带参数",
    affiliatesEmpty: "还没有联盟账号。用下方表单创建渠道码。",
    affiliatesCreate: "新建渠道",
    affiliatesCode: "渠道码",
    affiliatesName: "显示名称",
    affiliatesEmail: "联系邮箱",
    affiliatesNotes: "备注",
    affiliatesFirstPct: "首购 %",
    affiliatesRenewPct: "续费 %",
    affiliatesSubmit: "创建 / 更新",
    affiliatesMarkPaid: "标为已打款",
    affiliatesMarkPaidConfirm: "将该渠道所有 pending/payable 佣金标为已打款？",
    affiliatesPaidOk: "已标记打款",
    inactive: "已停用",
    activate: "启用",
    deactivate: "停用",
    firstRate: "首购佣金",
    renewRate: "续费佣金",
    referred: "绑定用户",
    commPending: "待结算",
    commPayable: "可打款",
    commPaid: "已打款",
    filterAll: "全部用户",
    filterBanned: "仅已封禁",
    filterActive: "未封禁",
  },
  en: {
    brand: "TalkLov Admin",
    overview: "Overview",
    users: "Users",
    reports: "Reports",
    verifications: "Verify",
    audit: "Audit",
    affiliates: "Affiliates",
    signOut: "Sign out",
    checking: "Checking admin access…",
    langZh: "中文",
    langEn: "EN",

    loginTitle: "TalkLov Admin",
    loginHint: "Sign in with the admin email",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    signIn: "Sign in",
    createAccount: "Create admin account",
    forgot: "Forgot password? Email me a reset link →",
    loginNoSignup: "Admin accounts are created in Supabase Auth by an owner. Sign-in only here.",
    showPassword: "Show password",
    hidePassword: "Hide password",

    overviewTitle: "Overview",
    overviewSub: "Live counts from Supabase (service role).",
    loadStatsFail: "Failed to load stats",
    statUsers: "Users",
    statNew24h: "New (24h)",
    statVip: "VIP / Founder",
    statFounders: "Founders",
    statFavorites: "Favorites",
    statViews24h: "Profile views (24h)",
    statPurchases7d: "Purchases (7d)",
    statAffiliates: "Affiliates",
    statOpenReports: "Open reports",
    statPendingVerify: "Pending verify",

    verifyTitle: "Flash Check review",
    verifySub: "Compare Flash Check capture to profile photos; high scores auto-approve.",
    verifyPending: "Pending",
    verifyApproved: "Approved",
    verifyRejected: "Rejected",
    verifyAll: "All",
    verifyEmpty: "No verification requests.",
    verifySelfie: "Submitted selfie",
    verifyProfilePhotos: "Profile photos",
    verifyApprove: "Approve",
    verifyReject: "Reject",
    verifyApproveConfirm: "Approve this real-person verification?",
    verifyRejectPrompt: "Rejection reason (shown to user):",
    verifyRejectNeedNote: "A reject note is required.",
    adminNote: "Note",
    reportNotePrompt: "Admin note (required):",
    reportNoteRequired: "Resolve/dismiss requires a note.",
    viewChat: "Open linked chat",
    confirmVip: "Grant VIP?",
    confirmClearVip: "Clear VIP?",
    confirmVerify: "Manually mark verified?",
    confirmUnverify: "Clear verified?",

    usersTitle: "Users",
    usersSub: "Search by name, handle, or UUID. Grant VIP / Founder / verified.",
    searchPlaceholder: "Search name / handle / uuid",
    search: "Search",
    loading: "Loading…",
    noUsers: "No users found.",
    noEmail: "no email",
    plan: "plan",
    verified: "verified",
    online: "online",
    ref: "ref",
    vip30: "VIP 30d",
    vip90: "VIP 90d",
    clearVip: "Clear VIP",
    founder: "Founder",
    verify: "Verify",
    unverify: "Unverify",
    founderConfirm: "Grant Founder slot to this user?",
    actionFail: "Action failed",
    region: "Region",
    phone: "Phone",
    detail: "Details",
    behavior: "Behavior",
    favOut: "Favorites out",
    favIn: "Favorited by",
    viewOut: "Profiles viewed",
    viewIn: "Viewed by",
    helloSent: "Hellos sent",
    helloRecv: "Hellos received",
    chats: "Conversations",
    purchases: "Purchases",
    backToUsers: "← Users",
    noPhone: "No phone bound",
    searchPhoneHint: "Also search phone / city",
    chatsTitle: "Chats",
    momentsTitle: "Moments",
    momentsEmpty: "No moments yet (run migrate_moments.sql).",
    momentsCount: "Moments",
    chatsEmpty: "No conversations yet.",
    openChat: "Open",
    closeChat: "Close",
    withPeer: "with",
    msgCount: "messages",
    icebreaker: "Icebreaker",
    status: "Status",
    voiceMsg: "[voice]",
    flagged: "flagged",
    chatAuditHint: "Opening a transcript writes an admin audit log.",
    loadChatFail: "Failed to load chat",
    asInitiator: "Initiator",
    asRecipient: "Recipient",
    ban: "Ban",
    unban: "Unban",
    banned: "Banned",
    banReasonPrompt: "Ban reason (shown to user):",
    unbanConfirm: "Unban this user?",
    reportsTitle: "Reports",
    reportsSub: "User-submitted tickets. Mark reviewing / resolved / dismissed.",
    reportOpen: "Open",
    reportReviewing: "Reviewing",
    reportResolved: "Resolved",
    reportDismissed: "Dismissed",
    reportAll: "All",
    reporter: "Reporter",
    target: "Target",
    reason: "Reason",
    markReviewing: "Mark reviewing",
    markResolved: "Resolve",
    markDismissed: "Dismiss",
    noReports: "No reports.",
    viewTarget: "View user",
    banAndResolve: "Ban & resolve",
    banAndResolveConfirm: "Ban this user and mark the report resolved?",
    auditTitle: "Audit log",
    auditSub: "Admin actions: profile/chat views, bans, grants, report updates.",
    auditSearchPlaceholder: "Search admin email / action / user UUID",
    auditAllActions: "All actions",
    auditEmpty: "No audit rows yet (run privacy migration for the table).",
    auditWhen: "When",
    auditAdmin: "Admin",
    auditAction: "Action",
    auditViewUser: "View user detail",
    auditListChats: "List chats",
    auditViewChat: "View chat transcript",
    affiliatesTitle: "Affiliates",
    affiliatesSub: "KOL codes, referred users, and commission totals.",
    affiliatesHint: "Share links with",
    affiliatesEmpty: "No affiliates yet. Create one with the form below.",
    affiliatesCreate: "New affiliate",
    affiliatesCode: "Code",
    affiliatesName: "Display name",
    affiliatesEmail: "Contact email",
    affiliatesNotes: "Notes",
    affiliatesFirstPct: "First %",
    affiliatesRenewPct: "Renew %",
    affiliatesSubmit: "Create / update",
    affiliatesMarkPaid: "Mark paid",
    affiliatesMarkPaidConfirm:
      "Mark all pending/payable commissions for this affiliate as paid?",
    affiliatesPaidOk: "Marked paid",
    inactive: "Inactive",
    activate: "Activate",
    deactivate: "Deactivate",
    firstRate: "First rate",
    renewRate: "Renew rate",
    referred: "Referred",
    commPending: "Pending",
    commPayable: "Payable",
    commPaid: "Paid",
    filterAll: "All users",
    filterBanned: "Banned only",
    filterActive: "Not banned",
  },
} as const;

export type AdminCopy = {
  [K in keyof (typeof copy)["zh"]]: string;
};

type AdminI18nValue = {
  locale: AdminLocale;
  setLocale: (l: AdminLocale) => void;
  t: AdminCopy;
};

const AdminI18nContext = createContext<AdminI18nValue | null>(null);

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>("zh");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "en" || raw === "zh") setLocaleState(raw);
    } catch {}
    setReady(true);
  }, []);

  const setLocale = useCallback((l: AdminLocale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t: copy[locale] }),
    [locale, setLocale]
  );

  // Avoid flash of wrong language on first paint after hydration
  if (!ready) {
    return (
      <AdminI18nContext.Provider value={value}>
        {children}
      </AdminI18nContext.Provider>
    );
  }

  return (
    <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) {
    throw new Error("useAdminI18n must be used within AdminI18nProvider");
  }
  return ctx;
}

export function AdminLangSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useAdminI18n();
  return (
    <div
      className={`inline-flex rounded-lg border border-white/15 p-0.5 text-xs ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("zh")}
        className={`rounded-md px-2 py-1 ${
          locale === "zh" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
        }`}
      >
        {t.langZh}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-md px-2 py-1 ${
          locale === "en" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
        }`}
      >
        {t.langEn}
      </button>
    </div>
  );
}
