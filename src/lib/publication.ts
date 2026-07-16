export type PublicationStatus = "draft" | "scheduled" | "published" | "archived";

export function isPublicationLive(status: PublicationStatus | string, publishAt: string | null, now = Date.now()) {
  if (status === "published") return true;
  return status === "scheduled" && Boolean(publishAt) && Date.parse(publishAt as string) <= now;
}

export function isPrebookOpen(deadline: string, now = Date.now()) {
  return Number.isFinite(Date.parse(deadline)) && Date.parse(deadline) > now;
}
