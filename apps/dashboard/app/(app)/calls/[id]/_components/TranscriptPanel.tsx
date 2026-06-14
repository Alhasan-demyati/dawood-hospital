"use client";

import { useEffect, useRef, useState } from "react";
import { cn, useLanguage } from "@dawood/shared";
import type { Turn } from "@/lib/queries";
import { formatArabicTime } from "@/lib/format";
import { subscribeToTurns } from "@/lib/realtime";

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
  const { t } = useLanguage();
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
    return <p className="text-sm text-text-muted">{t("call_detail_no_transcript")}</p>;
  }

  return (
    <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-surface p-4">
      {turns.map((tn) => (
        <div key={tn.id} className={cn("flex", tn.role === "agent" ? "justify-start" : "justify-end")}>
          <div
            className={cn(
              "max-w-[80%] rounded-lg px-3 py-2",
              tn.role === "agent" ? "bg-accent-soft text-text-primary" : "bg-background text-text-muted",
            )}
          >
            <p className="text-sm leading-relaxed">{tn.content_ar}</p>
            <time className="mt-1 block text-[10px] text-text-muted">{formatArabicTime(tn.spoken_at)}</time>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
