/** Demo AI partners that auto-accept openers and chat via /api/ai. */
export const AI_PERSONA_IDS = new Set(["mei", "jack"]);

export function isAiPersona(id: string | null | undefined): boolean {
  return !!id && AI_PERSONA_IDS.has(id);
}

/** Seconds before mei / jack auto-accept a hello (demo only). */
export const AI_AUTO_ACCEPT_SECONDS = 10;

const WELCOME_KEY = "nihello_ai_welcome_";

/** Mark that chat should auto-reply after the opener (set when AI accepts). */
export function markAiWelcomeReply(profileId: string, openerText: string) {
  try {
    sessionStorage.setItem(
      WELCOME_KEY + profileId,
      JSON.stringify({ opener: openerText, at: Date.now() })
    );
  } catch {}
}

export function takeAiWelcomeReply(
  profileId: string
): { opener: string } | null {
  try {
    const raw = sessionStorage.getItem(WELCOME_KEY + profileId);
    if (!raw) return null;
    sessionStorage.removeItem(WELCOME_KEY + profileId);
    const parsed = JSON.parse(raw) as { opener?: string };
    return parsed.opener ? { opener: parsed.opener } : null;
  } catch {
    return null;
  }
}
