import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { InstallPromptProvider } from "@/components/pwa/InstallPromptProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

import "./globals.css";

// Stitch design uses Manrope (headlines) + Inter (body) per the
// extracted token set. CSS variables are bound globally so the
// fonts are reachable from `font-headline` / `font-body` Tailwind
// classes anywhere in the tree.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-headline",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

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
    { media: "(prefers-color-scheme: light)", color: "#fefcf2" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c16" },
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
    <html
      lang="nb"
      data-theme="light"
      className={`${manrope.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // The bootstrap runs synchronously before paint — see design D4.
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body className="bg-bg text-fg font-body antialiased">
        <ThemeProvider>
          <InstallPromptProvider>{children}</InstallPromptProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
