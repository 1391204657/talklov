/** Phone helpers for TalkLov phone-first auth. */

export type DialCode = "+86" | "+1" | "+852" | "+853" | "+886";

export const DIAL_OPTIONS: {
  dial: DialCode;
  label: string;
  flag: string;
  locale: "zh" | "en";
  country: "CN" | "US" | "OTHER";
}[] = [
  { dial: "+86", label: "中国", flag: "🇨🇳", locale: "zh", country: "CN" },
  { dial: "+1", label: "美国/加拿大", flag: "🇺🇸", locale: "en", country: "US" },
  { dial: "+852", label: "香港", flag: "🇭🇰", locale: "zh", country: "OTHER" },
  { dial: "+853", label: "澳门", flag: "🇲🇴", locale: "zh", country: "OTHER" },
  { dial: "+886", label: "台湾", flag: "🇹🇼", locale: "zh", country: "OTHER" },
];

/** Digits only national number (no leading 0 for CN mobile). */
export function normalizeNational(raw: string, dial: DialCode): string {
  let d = raw.replace(/\D/g, "");
  if (dial === "+86" && d.startsWith("0")) d = d.slice(1);
  if (dial === "+1" && d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

export function toE164(dial: DialCode, national: string): string {
  const n = normalizeNational(national, dial);
  return `${dial}${n}`;
}

export function isValidNational(dial: DialCode, national: string): boolean {
  const n = normalizeNational(national, dial);
  if (dial === "+86") return /^1\d{10}$/.test(n);
  if (dial === "+1") return /^\d{10}$/.test(n);
  if (dial === "+852" || dial === "+853") return /^\d{8}$/.test(n);
  if (dial === "+886") return /^9\d{8}$/.test(n);
  return n.length >= 8 && n.length <= 15;
}

export function dialMeta(dial: DialCode) {
  return DIAL_OPTIONS.find((o) => o.dial === dial) ?? DIAL_OPTIONS[0];
}

export function maskE164(e164: string): string {
  if (e164.length < 6) return e164;
  return `${e164.slice(0, 4)}****${e164.slice(-4)}`;
}

/** Demo OTP when Supabase Phone Auth is not wired / offline. */
export const DEMO_OTP = "123456";
