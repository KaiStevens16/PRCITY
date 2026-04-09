"use client";

import { useEffect } from "react";

/**
 * iOS Safari may ignore viewport zoom hints in some cases.
 * This adds an explicit runtime guard against pinch and double-tap zoom.
 */
export function DisableZoom() {
  useEffect(() => {
    let lastTouchEnd = 0;

    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("gesturestart", onGesture, { passive: false });
    document.addEventListener("gesturechange", onGesture, { passive: false });
    document.addEventListener("gestureend", onGesture, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", onGesture);
      document.removeEventListener("gesturechange", onGesture);
      document.removeEventListener("gestureend", onGesture);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return null;
}
