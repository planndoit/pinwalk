import type { ClientPremiumPlaceEventType } from "@/lib/premium/events";

export function trackPremiumPlaceEvent(
  premiumPlaceId: string,
  eventType: ClientPremiumPlaceEventType,
  metadata?: Record<string, unknown>
): void {
  void fetch("/api/premium-places/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      premium_place_id: premiumPlaceId,
      event_type: eventType,
      metadata: metadata ?? {},
    }),
  }).catch(() => {});
}
