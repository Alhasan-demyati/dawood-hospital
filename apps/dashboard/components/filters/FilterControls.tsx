"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn, useLanguage, type TranslationKey } from "@dawood/shared";

// Shared filter plumbing: all filter bars push state into the URL searchParams
// so views are shareable and server-rendered. Reused by Calls/Visits/Handovers.
export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === "") params.delete(k);
        else params.set(k, v);
      }
      params.delete("page"); // reset pagination on any filter change
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, sp],
  );

  const reset = useCallback(() => router.push(pathname), [router, pathname]);

  return { sp, setParams, reset };
}

const fieldClass =
  "rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary";

export function FilterBar({ children, onReset }: { children: ReactNode; onReset: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
      {children}
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted transition hover:bg-accent-soft hover:text-text-primary"
      >
        {t("calls_filter_reset")}
      </button>
    </div>
  );
}

function FieldLabel({ labelKey, label }: { labelKey?: TranslationKey; label?: string }) {
  const { t } = useLanguage();
  return (
    <span className="mb-1 block text-xs font-medium text-text-muted">
      {label ?? (labelKey ? t(labelKey) : "")}
    </span>
  );
}

export function FSelect({
  labelKey,
  label,
  value,
  onChange,
  options,
}: {
  labelKey?: TranslationKey;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <FieldLabel labelKey={labelKey} label={label} />
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FDate({
  labelKey,
  label,
  value,
  onChange,
}: {
  labelKey?: TranslationKey;
  label?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel labelKey={labelKey} label={label} />
      <input type="date" dir="ltr" className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function FMultiChips({
  labelKey,
  label,
  selected,
  options,
  onChange,
}: {
  labelKey?: TranslationKey;
  label?: string;
  selected: string[];
  options: { value: string; label: string }[];
  onChange: (vals: string[]) => void;
}) {
  return (
    <div className="block">
      <FieldLabel labelKey={labelKey} label={label} />
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(on ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition",
                on ? "border-accent bg-accent-soft text-accent" : "border-border text-text-muted hover:bg-accent-soft",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FText({
  labelKey,
  label,
  value,
  onChange,
  placeholder,
}: {
  labelKey?: TranslationKey;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  // Commit on blur / Enter (not every keystroke) to avoid a navigation per key.
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const commit = () => {
    if (local !== value) onChange(local);
  };
  return (
    <label className="block">
      <FieldLabel labelKey={labelKey} label={label} />
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        className={fieldClass}
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}
