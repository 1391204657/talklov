/** Rewrite remote media URLs so CN clients load via talklov.com (not *.supabase.co). */

export function needsMediaProxy(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("data:")) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith(".supabase.co") ||
      host.endsWith(".supabase.in") ||
      host.includes("supabase")
    );
  } catch {
    return false;
  }
}

export function proxiedMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (!needsMediaProxy(url)) return url;
  return `/api/media/proxy?u=${encodeURIComponent(url)}`;
}

export function proxiedMediaList(urls: string[] | null | undefined): string[] {
  if (!urls?.length) return [];
  return urls.map((u) => proxiedMediaUrl(u)).filter(Boolean);
}
