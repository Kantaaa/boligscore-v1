"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The browser-vendored `BeforeInstallPromptEvent` is not in the TS DOM
 * lib. Declared inline so we can stash and replay it.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

interface InstallPromptContextValue {
  canInstall: boolean;
  /** Resolve to true if the user accepted the install. */
  install: () => Promise<boolean>;
}

const InstallPromptContext = createContext<InstallPromptContextValue | null>(
  null,
);

/**
 * Captures the `beforeinstallprompt` event passively (per design D8 — no
 * aggressive auto-prompt). The Meg page surfaces an "Installer som app"
 * button that calls `install()` to fire the saved event.
 */
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      // Stop the browser from showing its own banner — we surface our own
      // CTA in Meg.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === "accepted";
  }, [deferred]);

  const value = useMemo<InstallPromptContextValue>(
    () => ({ canInstall: deferred !== null, install }),
    [deferred, install],
  );

  return (
    <InstallPromptContext.Provider value={value}>
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt(): InstallPromptContextValue {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) {
    throw new Error(
      "useInstallPrompt must be used inside <InstallPromptProvider>",
    );
  }
  return ctx;
}
