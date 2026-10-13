import { getLatestDailyResetUtc } from "@/lib/dailyBonus";
import type { PublicAnnouncement } from "@/types/announcement";

const DISMISSALS_KEY = "pinwalk:announcement-dismissals";
const FOREVER = "forever";
const DAY_MS = 24 * 60 * 60 * 1000;

export type AnnouncementDismissKind = "close" | "today" | "forever";

export interface AnnouncementPopupSnapshot {
  current: PublicAnnouncement | null;
  done: boolean;
}

const SERVER_SNAPSHOT: AnnouncementPopupSnapshot = {
  current: null,
  done: false,
};

const listeners = new Set<() => void>();
let started = false;
let queue: PublicAnnouncement[] = [];
let snapshot: AnnouncementPopupSnapshot = { current: null, done: false };

function publish(done: boolean): void {
  snapshot = { current: queue[0] ?? null, done };
  for (const listener of listeners) listener();
}

function readDismissals(nowMs: number): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(DISMISSALS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const kept: Record<string, string> = {};
    let removed = false;
    for (const [id, value] of Object.entries(parsed)) {
      if (
        value === FOREVER ||
        (typeof value === "string" && Date.parse(value) > nowMs)
      ) {
        kept[id] = value;
      } else {
        removed = true;
      }
    }
    if (removed) {
      window.localStorage.setItem(DISMISSALS_KEY, JSON.stringify(kept));
    }
    return kept;
  } catch {
    return {};
  }
}

function saveDismissal(id: string, value: string): void {
  try {
    const dismissals = readDismissals(Date.now());
    dismissals[id] = value;
    window.localStorage.setItem(DISMISSALS_KEY, JSON.stringify(dismissals));
  } catch {
    // 저장에 실패해도 이번 실행에서는 큐에서 빠졌으므로 다시 뜨지 않는다.
  }
}

export function subscribeAnnouncementPopup(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAnnouncementPopupSnapshot(): AnnouncementPopupSnapshot {
  return snapshot;
}

export function getAnnouncementPopupServerSnapshot(): AnnouncementPopupSnapshot {
  return SERVER_SNAPSHOT;
}

/** 이번 실행에서 처음 한 번만 팝업 공지를 조회한다. */
export function startAnnouncementPopups(): void {
  if (started) return;
  started = true;

  void (async () => {
    try {
      const res = await fetch("/api/announcements/popup", { cache: "no-store" });
      if (!res.ok) {
        publish(true);
        return;
      }
      const data = (await res.json()) as {
        announcements?: PublicAnnouncement[];
      };
      const dismissals = readDismissals(Date.now());
      queue = (data.announcements ?? []).filter(
        (announcement) => !dismissals[announcement.id]
      );
      publish(queue.length === 0);
    } catch {
      queue = [];
      publish(true);
    }
  })();
}

export function dismissCurrentAnnouncement(kind: AnnouncementDismissKind): void {
  const current = queue[0];
  if (!current) return;

  if (kind === "today") {
    const hiddenUntil = new Date(
      getLatestDailyResetUtc(new Date()).getTime() + DAY_MS
    );
    saveDismissal(current.id, hiddenUntil.toISOString());
  } else if (kind === "forever") {
    saveDismissal(current.id, FOREVER);
  }

  queue = queue.slice(1);
  publish(queue.length === 0);
}
