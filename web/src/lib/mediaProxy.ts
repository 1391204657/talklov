/**
 * Media URLs — same for every region.
 * CN Safari diag showed direct *.supabase.co is reachable; forcing a proxy hop
 * was unnecessary and added latency. Keep /api/media/proxy for optional use.
 */

export function needsMediaProxy(_url: string | null | undefined): boolean {
  return false;
}

export function proxiedMediaUrl(url: string | null | undefined): string {
  return url || "";
}

export function proxiedMediaList(urls: string[] | null | undefined): string[] {
  if (!urls?.length) return [];
  return urls.filter(Boolean) as string[];
}
