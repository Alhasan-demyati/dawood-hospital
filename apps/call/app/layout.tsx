import type { Metadata } from "next";
import { LanguageProvider, ThemeProvider } from "@dawood/shared";
import "./globals.css";

export const metadata: Metadata = {
  title: "مساعد مستشفى داوود الصوتي",
  description:
    "تحدّثوا مع المساعد الصوتي لمستشفى داوود — للحجز، أو الاستفسار عن موعدكم، أو الاتجاهات وأوقات الدوام.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // dir/lang/data-theme are seeded to Arabic + light for the first paint; the
  // Language/Theme providers flip them at runtime when the toggles are clicked.
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
