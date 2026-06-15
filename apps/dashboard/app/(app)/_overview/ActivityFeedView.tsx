"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage, MedicalGlyph, type TranslationKey, type GlyphName } from "@dawood/shared";
import type { ActivityFeedItem } from "@/lib/queries";
import { formatArabicDateTime } from "@/lib/format";
import { subscribeToHandovers } from "@/lib/realtime";
import { EmptyState } from "@/components/editorial/EmptyState";

type Kind = ActivityFeedItem["kind"];

const KIND: Record<Kind, { color: string; tagKey: TranslationKey; glyph: GlyphName }> = {
  tool_call: { color: "var(--color-accent)", tagKey: "activity_tag_tool", glyph: "tool" },
  handover: { color: "var(--color-warning)", tagKey: "activity_tag_handover", glyph: "handover" },
  visit_booked: { color: "var(--color-success)", tagKey: "activity_tag_visit", glyph: "visit" },
};

// Client view: a connected vertical timeline. A rail runs through colored,
// typed nodes; each event is a card with a kind tag + timestamp. New handovers
// stream in at the top, live. Reads correctly in LTR/RTL (logical insets).
export function ActivityFeedView({ initial }: { initial: ActivityFeedItem[] }) {
  const { t } = useLanguage();
  const [items, setItems] = useState(initial);

  useEffect(() => setItems(initial), [initial]);

  useEffect(
    () =>
      subscribeToHandovers((row) => {
        setItems((prev) =>
          [
            {
              id: `handover_${row.id}`,
              kind: "handover" as const,
              happened_at: row.triggered_at,
              label_ar: `تحويل إلى موظف بشري (${row.reason_code})`,
              link_to: "/handovers",
            },
            ...prev,
          ].slice(0, 20),
        );
      }),
    [],
  );

  if (!items.length) return <EmptyState messageKey="empty_state_generic" />;

  return (
    <ol className="relative">
      {/* the rail — sits under the nodes, through their centres */}
      <span
        className="pointer-events-none absolute inset-y-3 start-[13px] w-px"
        style={{ background: "linear-gradient(to bottom, transparent, var(--color-border-strong) 8%, var(--color-border-strong) 92%, transparent)" }}
        aria-hidden
      />
      {items.map((it, idx) => {
        const meta = KIND[it.kind];
        return (
          <li key={it.id} className="relative flex gap-3 pb-3 last:pb-0">
            {/* node */}
            <span
              className="node-pop relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{
                background: `color-mix(in srgb, ${meta.color} 16%, var(--color-surface))`,
                color: meta.color,
                boxShadow: `0 0 0 2px var(--color-surface), inset 0 0 0 1px color-mix(in srgb, ${meta.color} 38%, transparent)`,
                animationDelay: `${Math.min(idx, 6) * 45}ms`,
              }}
              aria-hidden
            >
              <MedicalGlyph name={meta.glyph} className="h-3.5 w-3.5" strokeWidth={1.8} />
            </span>

            {/* card */}
            <div className="min-w-0 flex-1 rounded-xl border border-hairline bg-surface px-3.5 py-2.5 transition-colors hover:bg-surface-2">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="t-eyebrow rounded-full px-1.5 py-0.5"
                  style={{ background: `color-mix(in srgb, ${meta.color} 15%, var(--color-surface))`, color: meta.color }}
                >
                  {t(meta.tagKey)}
                </span>
                <time className="t-caption ms-auto tabular-nums text-text-faint">{formatArabicDateTime(it.happened_at)}</time>
              </div>
              <div className="text-sm leading-snug text-text-primary">
                {it.link_to ? (
                  <Link
                    href={it.link_to}
                    className="rounded-sm transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {it.label_ar}
                  </Link>
                ) : (
                  it.label_ar
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
