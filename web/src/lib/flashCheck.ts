/**
 * Product name for real-person motion selfie check.
 * Avoid clinical「活体」in user-facing copy — use 闪验 / Flash Check.
 */

export const FLASH_CHECK = {
  zh: {
    name: "闪验",
    full: "真人闪验",
    verb: "完成闪验",
    hint: "对着镜头做几个小动作，几秒确认是真人本人。不采集证件。",
    start: "开始闪验",
    again: "重新闪验",
    submitting: "正在确认…",
    passed: "闪验通过，已获得认证徽章。",
    pending: "闪验已完成，等待人工复核。",
    failed: "这次没通过，请光线充足后重试。",
    fallback: "当前使用安全自拍通道（闪验服务未开通时）。",
    needCamera: "需要摄像头权限以完成闪验。",
  },
  en: {
    name: "Flash Check",
    full: "Flash Check",
    verb: "Complete Flash Check",
    hint: "A few quick on-camera moves to confirm you’re a real person. No government ID.",
    start: "Start Flash Check",
    again: "Try Flash Check again",
    submitting: "Confirming…",
    passed: "Flash Check passed — you’re verified.",
    pending: "Flash Check done — pending a quick human review.",
    failed: "Didn’t pass this time. Retry in better light.",
    fallback: "Using secure selfie upload (Flash Check service offline).",
    needCamera: "Camera access is required for Flash Check.",
  },
} as const;

export function flashCopy(en: boolean) {
  return en ? FLASH_CHECK.en : FLASH_CHECK.zh;
}

/** AWS Amplify Face Liveness UI strings — keep in sync with locale. */
export function livenessDisplayText(en: boolean): Record<string, string> {
  if (en) return {};
  return {
    photosensitivityWarningHeadingText: "光敏提示",
    photosensitivityWarningBodyText:
      "闪验过程中屏幕会快速变色。若你对闪光敏感，请谨慎使用。",
    photosensitivityWarningInfoText: "了解更多",
    photosensitivityWarningLabelText: "光敏警告",
    startScreenBeginCheckText: "开始闪验",
    goodFitCaptionText: "位置合适",
    tooFarCaptionText: "再靠近一点",
    hintCenterFaceText: "把脸放在圆框中间",
    hintCenterFaceInstructionText: "把脸对准圆框中央",
    hintMoveFaceFrontOfCameraText: "请正对摄像头",
    hintTooManyFacesText: "画面里只能有一张脸",
    hintFaceDetectedText: "已检测到面部",
    hintCanNotIdentifyText: "未识别到面部",
    hintTooCloseText: "离远一点",
    hintTooFarText: "靠近一点",
    hintConnectingText: "连接中…",
    hintVerifyingText: "正在确认…",
    hintCheckCompleteText: "检查完成",
    hintIlluminationTooBrightText: "光线太亮",
    hintIlluminationTooDarkText: "光线太暗",
    hintIlluminationNormalText: "光线正常",
    hintHoldFaceForFreshnessText: "请保持不动",
    hintFaceOffCenterText: "脸偏了，请居中",
    hintMatchIndicatorText: "继续保持",
    cancelLivenessCheckText: "取消",
    recordingIndicatorText: "录制中",
    waitingCameraPermissionText: "等待摄像头权限…",
    cameraNotFoundHeadingText: "未找到摄像头",
    cameraNotFoundMessageText: "请检查摄像头权限后重试。",
    retryCameraPermissionsText: "重试",
    tryAgainText: "再试一次",
    timeoutHeaderText: "超时",
    timeoutMessageText: "时间到了，请重试。",
    connectionTimeoutHeaderText: "连接超时",
    connectionTimeoutMessageText: "网络不稳定，请重试。",
    errorLabelText: "出错了",
  };
}

/** AWS configured on server when these env vars exist. */
export function isLivenessEnvConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim() &&
      (process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim())
  );
}

export function livenessRegion() {
  return (
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "us-east-1"
  );
}

/** Below this, reject and ask user to retry. */
export function livenessMinScore() {
  const n = Number(process.env.LIVENESS_MIN_SCORE ?? "70");
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 70;
}

/**
 * Auto-grant verified badge at or above this confidence (0–100).
 * Default matches min score so a successful check passes immediately.
 */
export function livenessAutoApproveScore() {
  const n = Number(
    process.env.LIVENESS_AUTO_APPROVE_SCORE ?? String(livenessMinScore())
  );
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : livenessMinScore();
}
