"use client";

import { useEffect, useState } from "react";

/**
 * Banner shown when the browser reports offline. Per spec, MVP does not
 * queue offline mutations — it only informs the user and any write
 * controls down-stream should disable themselves.
 */
export function OfflineBanner() {
  // Default to "online" during SSR and on first client render to avoid
  // hydration mismatch; we update on mount.
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function update() {
      setIsOffline(!navigator.onLine);
    }
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 bg-status-i-budrunde px-4 py-2 text-center text-sm text-fg"
    >
      Du er offline — endringer lagres ikke.
    </div>
  );
}
