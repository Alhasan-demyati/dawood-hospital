"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@dawood/shared";
import { getSupabaseBrowser } from "@/lib/supabase";
import { SignedOutBanner } from "@/components/auth/SignedOutBanner";

// Magic Link request form. `sendMagicLink` is implemented here against the
// browser client (anon key is public) rather than imported from lib/auth.ts —
// that module is server-only (requireAuth pulls next/headers) and importing it
// here would break the client bundle.
export function LoginForm({ initialError }: { initialError: string | null }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  const sendMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const { error: otpError } = await getSupabaseBrowser().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (otpError) setError("invalid_link");
      else setSent(true);
    } catch {
      setError("invalid_link");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-surface p-6">
      <h1 className="font-display text-xl font-semibold text-text-primary">{t("login_title")}</h1>
      <SignedOutBanner error={error} />
      {sent ? (
        <p className="rounded-md border border-success bg-surface px-4 py-3 text-sm text-success">
          {t("login_sent")}
        </p>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("login_email_placeholder")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <button
            type="submit"
            disabled={pending || !email}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {t("login_send_link")}
          </button>
        </form>
      )}
    </div>
  );
}
