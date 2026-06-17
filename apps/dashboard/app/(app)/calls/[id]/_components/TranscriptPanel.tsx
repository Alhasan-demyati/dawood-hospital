"use client";

import { useEffect, useRef, useState } from "react";
import { cn, useLanguage } from "@dawood/shared";
import type { Turn } from "@/lib/queries";
import { formatTime } from "@/lib/format";
import { subscribeToTurns } from "@/lib/realtime";
import { EmptyState } from "@/components/editorial/EmptyState";

// Transcript bubbles. If the call is still live (ended_at IS NULL), subscribes
// to subscribeToTurns and appends new turns at the bottom. Agent on the start
// side, caller on the end side (follows RTL/LTR direction).
export function TranscriptPanel({
  conversationId,
  initial,
  live,
}: {
  conversationId: string;
  initial: Turn[];
  live: boolean;
}) {
  const { t, lang } = useLanguage();
  const [turns, setTurns] = useState<Turn[]>(initial);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setTurns(initial), [initial]);

  useEffect(() => {
    if (!live) return;
    return subscribeToTurns(conversationId, (turn) =>
      setTurns((prev) => (prev.some((x) => x.id === turn.id) ? prev : [...prev, turn])),
    );
  }, [conversationId, live]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  if (!turns.length) {
    return <EmptyState variant="transcript" messageKey="call_detail_no_transcript" />;
  }

  return (
    <div className="relative flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-xl border border-hairline bg-surface-3 p-4 shadow-card">
      {/* lit top edge on the recessed transcript well */}
      <span
        className="pointer-events-none sticky inset-x-0 top-0 -mb-px block h-0 rounded-[inherit]"
        style={{ boxShadow: "var(--highlight-top)" }}
        aria-hidden
      />
      {turns.map((tn) => {
        const isAgent = tn.role === "agent";
        return (
          <div key={tn.id} className={cn("flex", isAgent ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm",
                isAgent
                  ? "border border-hairline bg-accent-soft text-text-primary"
                  : "border border-hairline bg-surface-raised text-text-primary",
              )}
            >
              <p className="t-body-sm leading-relaxed">{tn.content_ar}</p>
              <time className="t-caption mt-1 block text-text-faint">{formatTime(tn.spoken_at, lang)}</time>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
