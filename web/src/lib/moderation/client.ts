import {
  formatModerationBlock,
  type ModerationResult,
} from "./types";
import { scanBlocklist } from "./blocklist";

export type ModerateInput = {
  text?: string;
  /** data:image/...;base64,... */
  imageDataUrl?: string;
};

/**
 * Client-side moderation: local keyword pre-check, then /api/moderate.
 */
export async function moderateContent(
  input: ModerateInput
): Promise<ModerationResult> {
  const text = input.text?.trim();
  const imageDataUrl = input.imageDataUrl;

  if (!text && !imageDataUrl) {
    return { allowed: true, categories: [], reason: "", source: "empty" };
  }

  if (text) {
    const hit = scanBlocklist(text);
    if (hit.hit) {
      return {
        allowed: false,
        categories: hit.categories,
        reason: formatModerationBlock({
          allowed: false,
          categories: hit.categories,
          reason: "",
          source: "keyword",
        }),
        source: "keyword",
      };
    }
  }

  try {
    const res = await fetch("/api/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text || undefined,
        // Cap huge data URLs for API body size
        imageDataUrl: imageDataUrl
          ? imageDataUrl.slice(0, 1_400_000)
          : undefined,
      }),
    });
    const data = (await res.json()) as ModerationResult & { error?: string };
    if (res.status === 401) {
      // Not signed in — rely on local keywords only
      return { allowed: true, categories: [], reason: "", source: "auth_required" };
    }
    if (res.status === 429) {
      // Soft-fail open so chat isn't bricked; keywords already applied
      return { allowed: true, categories: [], reason: "", source: "rate_limit" };
    }
    if (!res.ok) {
      // Fail open for availability, but local keywords already ran
      return { allowed: true, categories: [], reason: "", source: "api_error" };
    }
    if (!data.allowed) {
      return {
        ...data,
        reason: data.reason || formatModerationBlock(data),
      };
    }
    return data;
  } catch {
    return { allowed: true, categories: [], reason: "", source: "network_error" };
  }
}

export { formatModerationBlock };
