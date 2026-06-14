"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn, useLanguage } from "@dawood/shared";

// Prev/next pager driven by a `page` searchParam. `hasNext` is a heuristic
// (the page passes rows.length === pageSize).
export function Pagination({ page, hasNext }: { page: number; hasNext: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { t } = useLanguage();

  const go = (next: number) => {
    const params = new URLSearchParams(sp.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const btn = "rounded-md border border-border px-3 py-1.5 text-sm transition disabled:opacity-40";
  return (
    <div className="mt-4 flex items-center justify-between">
      <button type="button" className={cn(btn, "hover:bg-accent-soft")} disabled={page <= 1} onClick={() => go(page - 1)}>
        {t("prev")}
      </button>
      <span className="text-xs text-text-muted">{page}</span>
      <button type="button" className={cn(btn, "hover:bg-accent-soft")} disabled={!hasNext} onClick={() => go(page + 1)}>
        {t("next")}
      </button>
    </div>
  );
}
