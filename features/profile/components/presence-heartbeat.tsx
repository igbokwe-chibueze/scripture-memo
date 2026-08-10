"use client";

import { useEffect } from "react";
import { markPlayerActiveAction } from "@/features/profile/actions/mark-player-active.action";

const HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000;

/** Sends a coarse, cost-conscious heartbeat only while the game is visible. */
export function PresenceHeartbeat(): null {
  useEffect(() => {
    const reportActivity = (): void => {
      if (document.visibilityState === "visible") {
        void markPlayerActiveAction();
      }
    };

    reportActivity();
    const intervalId = window.setInterval(
      reportActivity,
      HEARTBEAT_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", reportActivity);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", reportActivity);
    };
  }, []);

  return null;
}
