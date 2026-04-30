import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Boligscore",
  description: "Score boliger sammen med husstanden din.",
  applicationName: "Boligscore",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1f1d" },
  ],
};

/**
 * No-FOUC theme bootstrap (design D4).
 *
 * Reads `localStorage.theme` and applies it to <html data-theme="..."> *before*
 * React hydration, so reload-with-dark never flashes the light palette.
 * Falls back to "light" when the value is missing or invalid.
 */
const themeBootstrap = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`.trim();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          // The bootstrap runs synchronously before paint — see design D4.
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body className="bg-bg text-fg font-sans antialiased">{children}</body>
    </html>
  );
}
