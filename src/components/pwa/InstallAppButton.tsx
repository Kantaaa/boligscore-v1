"use client";

// Placeholder. Real implementation lands in task group 7 (PWA setup),
// at which point this captures the deferred `beforeinstallprompt` event
// and fires it on click.

export function InstallAppButton() {
  return (
    <button
      type="button"
      disabled
      aria-disabled
      title="Installasjon krever en kompatibel nettleser i HTTPS-modus."
      className="inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-fg-muted"
    >
      <span aria-hidden>⤓</span>
      <span>Installer som app</span>
    </button>
  );
}
