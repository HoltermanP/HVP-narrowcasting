/** Een scherm geldt als online als de laatste heartbeat < 2 minuten oud is. */
export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function isScreenOnline(lastSeenAt: Date | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() < ONLINE_THRESHOLD_MS;
}

export function formatLastSeen(lastSeenAt: Date | null): string {
  if (!lastSeenAt) return "Nog nooit gezien";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(lastSeenAt);
}
