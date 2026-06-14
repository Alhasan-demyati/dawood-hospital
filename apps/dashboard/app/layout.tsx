import type { Metadata } from "next";
import { dict, LanguageProvider, ThemeProvider } from "@dawood/shared";
import "./globals.css";

export const metadata: Metadata = {
  title: dict.ar.dashboard_title,
  description: dict.ar.appName,
};

// Root layout: html shell + providers ONLY (no requireAuth, no sidebar) so the
// public /login and /auth/callback routes render without the auth gate. The
// authed shell lives in app/(app)/layout.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html dir="rtl" lang="ar" data-theme="light" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider defaultLang="ar">{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
