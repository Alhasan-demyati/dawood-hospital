"use client";

import { useLanguage, type TranslationKey } from "@dawood/shared";

// Surfaces a ?error= code on /login as a localized banner. Marked "use client"
// (not server, as the file-map label suggests) because it localizes the message
// via the client-only LanguageProvider; the login page passes the code in.
const ERROR_KEYS: Record<string, TranslationKey> = {
  not_authorized: "login_not_authorized",
  invalid_link: "login_invalid_link",
};

export function SignedOutBanner({ error }: { error?: string | null }) {
  const { t } = useLanguage();
  if (!error) return null;
  const key = ERROR_KEYS[error];
  if (!key) return null;
  return (
    <div role="alert" className="rounded-md border border-danger bg-surface px-4 py-2 text-center text-sm text-danger">
      {t(key)}
    </div>
  );
}
