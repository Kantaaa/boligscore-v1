"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `callback` whenever the browser tab regains focus
 * (`visibilitychange` with visibilityState === 'visible', and
 * `focus`). The callback is debounced so a tab restore that fires both
 * events back-to-back only triggers one refetch.
 *
 * Spec coverage:
 *   - "Refresh on tab focus" — D6, polling-on-focus, no Realtime.
 *   - "Tab focus triggers refetch" → fires once on visibility flip.
 *
 * The hook does NOT call `callback` on initial mount — server-side
 * data is already fresh. Any caller that needs an initial refetch
 * should call it explicitly.
 */
export function useFocusRefresh(
  callback: () => void,
  debounceMs: number = 200,
): void {
  // Keep a stable ref to the callback so changing it doesn't re-bind
  // the listeners on every render.
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    function fireDebounced() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        callbackRef.current();
        timer = null;
      }, debounceMs);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        fireDebounced();
      }
    }

    function onFocus() {
      fireDebounced();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      if (timer) clearTimeout(timer);
    };
  }, [debounceMs]);
}
