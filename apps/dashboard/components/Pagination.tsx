"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn, useLanguage } from "@dawood/shared";
import { toArabicIndicDigits } from "@/lib/format";

// Prev/next pager driven by a `page` searchParam. `hasNext` is a heuristic
// (the page passes rows.length === pageSize).
export function Pagination({ page, hasNext }: { page: number; hasNext: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { lang, t } = useLanguage();
  const ar = lang === "ar";

  const go = (next: number) => {
    const params = new URLSearchParams(sp.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // RTL-aware chevrons: "prev" points to the inline-start, "next" to the
  // inline-end. The page mirrors automatically under dir=rtl, so a CSS-only
  // flip on the start glyph keeps both arrows pointing the right way.
  const btn =
    "group inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted shadow-sm transition hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:hover:bg-surface disabled:hover:text-text-muted";

  // RTL-aware chevron — points to the inline-start ("prev"). Mirror it for the
  // "next" direction. The chevron itself is flipped under dir=rtl so it keeps
  // following reading order in both languages.
  const Chevron = ({ dir }: { dir: "start" | "end" }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "h-3.5 w-3.5 shrink-0 transition-transform duration-200 rtl:scale-x-[-1]",
        dir === "start"
          ? "group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
          : "rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
      )}
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );

  return (
    <div className="mt-4 flex items-center justify-between">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => go(page - 1)}>
        <Chevron dir="start" />
        <span>{t("prev")}</span>
      </button>

      <span
        className="t-numeral grid h-8 min-w-8 place-items-center rounded-lg border border-hairline bg-surface-2 px-2.5 text-sm text-text-primary tabular-nums"
        style={{ boxShadow: "var(--highlight-top)" }}
      >
        {ar ? toArabicIndicDigits(String(page)) : page}
      </span>

      <button type="button" className={btn} disabled={!hasNext} onClick={() => go(page + 1)}>
        <span>{t("next")}</span>
        <Chevron dir="end" />
      </button>
    </div>
  );
}
