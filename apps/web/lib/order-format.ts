import type { TrackingEvent } from "./types";

// Pinned to Yangon so the server and the browser render the same day; an
// unpinned locale flips the date near midnight and breaks hydration.
const TIME_ZONE = "Asia/Yangon";

export function formatOrderDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

export function formatOrderTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}

/**
 * Events arrive oldest first and statuses only move forward, so the first
 * event reaching a status is the moment that step happened.
 */
export function orderEventTimes(order: { events?: TrackingEvent[] }): Map<string, string> {
  const times = new Map<string, string>();

  for (const event of order.events ?? []) {
    if (event.to && event.at && !times.has(event.to)) {
      times.set(event.to, event.at);
    }
  }

  return times;
}

export function latestOrderEventAt(order: {
  events?: { at: string | null }[];
  created_at: string | null;
}): string | null {
  const events = order.events ?? [];

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const at = events[index]?.at;

    if (at) {
      return at;
    }
  }

  return order.created_at;
}
