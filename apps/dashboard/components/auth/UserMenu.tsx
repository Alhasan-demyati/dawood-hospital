"use client";

import { useRouter } from "next/navigation";
import { cn, useLanguage } from "@dawood/shared";
import { getSupabaseBrowser } from "@/lib/supabase";

// Signed-in identity + sign-out. Email shows full on wide widths, local-part
// only on narrow ones.
export function UserMenu({ email, className }: { email: string; className?: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const localPart = email.split("@")[0];

  const signOut = async () => {
    try {
      await getSupabaseBrowser().auth.signOut();
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <span className="min-w-0 truncate text-xs text-text-muted" title={email}>
        <span className="hidden lg:inline">{email}</span>
        <span className="lg:hidden">{localPart}</span>
      </span>
      <button
        type="button"
        onClick={signOut}
        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-text-primary transition hover:bg-accent-soft"
      >
        {t("signout")}
      </button>
    </div>
  );
}
