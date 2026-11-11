"use client";

import { useSyncExternalStore } from "react";
import { todayIso } from "@/lib/store";

/**
 * Today's date as an ISO string ("2026-11-10").
 *
 * Next.js 16 (Cache Components) forbids reading the clock during the
 * prerender, so the clock is read only on the client — the same pattern
 * the Header uses for its date pill. During the prerendered shell the
 * fallback is the Monday of the seed week (2026-11-09, the Pascualita
 * Reel), so the HTML still shows real seed data; on hydration it
 * becomes the actual day.
 */
export const PRERENDER_ISO = "2026-11-09";

export function useTodayIso(): string {
  return (
    useSyncExternalStore(
      () => () => {},
      () => (typeof window === "undefined" ? null : todayIso()),
      () => PRERENDER_ISO,
    ) ?? PRERENDER_ISO
  );
}
