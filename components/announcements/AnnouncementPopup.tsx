"use client";

import { useEffect, useSyncExternalStore } from "react";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import AnnouncementPopupFooter from "@/components/announcements/AnnouncementPopupFooter";
import OverlayPortal from "@/components/layout/OverlayPortal";
import {
  dismissCurrentAnnouncement,
  getAnnouncementPopupServerSnapshot,
  getAnnouncementPopupSnapshot,
  startAnnouncementPopups,
  subscribeAnnouncementPopup,
} from "@/lib/announcements/popupState";

export default function AnnouncementPopup() {
  const { current } = useSyncExternalStore(
    subscribeAnnouncementPopup,
    getAnnouncementPopupSnapshot,
    getAnnouncementPopupServerSnapshot
  );

  useEffect(() => {
    startAnnouncementPopups();
  }, []);

  if (!current) return null;

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[55] flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
      >
        <div className="absolute inset-0 bg-black/50" />
        <AnnouncementCard
          key={current.id}
          title={current.title}
          body={current.body}
          footer={
            <AnnouncementPopupFooter
              onClose={() => dismissCurrentAnnouncement("close")}
              onHideToday={() => dismissCurrentAnnouncement("today")}
              onHideForever={() => dismissCurrentAnnouncement("forever")}
            />
          }
        />
      </div>
    </OverlayPortal>
  );
}
