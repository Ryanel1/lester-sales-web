export type LinkHealth = "available" | "warning" | "unavailable";

export function linkHealthFromStatus(status: number): LinkHealth {
  if (status >= 200 && status < 400) return "available";
  if (status === 401 || status === 403 || status === 405 || status === 429) return "warning";
  return "unavailable";
}

export async function checkExternalLink(url: string): Promise<{ status: LinkHealth; httpStatus: number | null }> {
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8_000) });
    if ([403, 405].includes(response.status)) response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "follow", signal: AbortSignal.timeout(8_000) });
    return { status: linkHealthFromStatus(response.status), httpStatus: response.status };
  } catch {
    return { status: "unavailable", httpStatus: null };
  }
}
