"use client";

import { useInstallPrompt } from "@/components/pwa/InstallPromptProvider";

/**
 * "Installer som app" CTA shown on the Meg page (design D8 — passive,
 * no auto-prompt). Disabled when the browser hasn't fired
 * `beforeinstallprompt` yet (already installed, unsupported browser, or
 * insufficient engagement signal).
 */
export function InstallAppButton() {
  const { canInstall, install } = useInstallPrompt();

  return (
    <button
      type="button"
      onClick={() => {
        void install();
      }}
      disabled={!canInstall}
      aria-disabled={!canInstall}
      title={
        canInstall
          ? "Installer Boligscore som app"
          : "Installasjon er ikke tilgjengelig i denne nettleseren akkurat nå."
      }
      className={[
        "inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md border px-4 py-2",
        canInstall
          ? "border-primary bg-primary text-primary-fg"
          : "border-border bg-surface text-fg-muted",
      ].join(" ")}
    >
      <span aria-hidden>⤓</span>
      <span>Installer som app</span>
    </button>
  );
}
