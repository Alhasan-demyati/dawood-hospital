"use client";

import { useState, type FormEvent } from "react";
import { useLanguage, MedicalGlyph, VitalLine } from "@dawood/shared";
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
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-8 shadow-pop">
      {/* Inset lit top edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: "var(--highlight-top)" }}
      />

      <div className="relative space-y-6">
        {/* Emblem: rounded tile + cross glyph + gold signature dot */}
        <div className="flex flex-col items-center text-center">
          <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 shadow-card">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit]"
              style={{ boxShadow: "var(--highlight-top)" }}
            />
            <MedicalGlyph name="cross" className="relative h-7 w-7 text-accent" strokeWidth={2} />
            <span
              aria-hidden
              className="absolute -end-1 -top-1 h-3 w-3 rotate-45 rounded-[3px] bg-accent-2 shadow-sm"
            />
          </span>

          <h1 className="t-display-md mt-5 text-text-primary">{t("login_title")}</h1>

          {/* Signature vital line under the title */}
          <span aria-hidden className="mt-4 block w-24">
            <VitalLine mode="draw" height={16} />
          </span>
        </div>

        <SignedOutBanner error={error} />

        {sent ? (
          <p
            className="rounded-xl border border-success px-4 py-3 text-center text-sm text-success"
            style={{ background: "color-mix(in srgb, var(--color-success) 10%, var(--color-surface))" }}
          >
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
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-faint transition focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={pending || !email}
              className="group relative w-full overflow-hidden rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={{ boxShadow: "var(--highlight-top)" }}
              />
              <span className="relative">{t("login_send_link")}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
