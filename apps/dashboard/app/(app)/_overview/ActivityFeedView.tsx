"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@dawood/shared";
import type { ActivityFeedItem } from "@/lib/queries";
import { formatArabicDateTime } from "@/lib/format";
import { subscribeToHandovers } from "@/lib/realtime";
import { EmptyState } from "@/components/editorial/EmptyState";

const DOT_TONE: Record<ActivityFeedItem["kind"], string> = {
  tool_call: "bg-accent",
  handover: "bg-warning",
  visit_booked: "bg-success",
};

// Client view: renders the timeline and prepends new handovers live.
export function ActivityFeedView({ initial }: { initial: ActivityFeedItem[] }) {
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
    <ol className="space-y-3">
      {items.map((it) => (
        <li key={it.id} className="flex gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", DOT_TONE[it.kind])} aria-hidden />
          <div className="min-w-0">
            <div className="text-sm text-text-primary">
              {it.link_to ? (
                <Link href={it.link_to} className="hover:text-accent">
                  {it.label_ar}
                </Link>
              ) : (
                it.label_ar
              )}
            </div>
            <time className="text-xs text-text-muted">{formatArabicDateTime(it.happened_at)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}
