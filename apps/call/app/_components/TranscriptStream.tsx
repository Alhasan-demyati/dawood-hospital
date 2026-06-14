"use client";

import { useEffect, useRef } from "react";
import { cn, useLanguage } from "@dawood/shared";

export type TranscriptBubble = {
  id: number;
  speaker: "user" | "agent";
  text: string;
};

function Avatar({ speaker }: { speaker: "user" | "agent" }) {
  if (speaker === "agent") {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="9" y="3" width="6" height="10" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background text-text-muted">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// Live transcript bubbles. Salma on the start side (accent), caller on the end
// side. Direction follows the document's RTL/LTR.
export function TranscriptStream({ messages }: { messages: TranscriptBubble[] }) {
  const { t } = useLanguage();
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-[7rem] w-full items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center text-sm text-text-muted">
        {t("transcript_empty")}
      </div>
    );
  }

  return (
    <div className="flex max-h-96 w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-surface p-4">
      {messages.map((m) => {
        const agent = m.speaker === "agent";
        return (
          <div key={m.id} className={cn("flex items-end gap-2", agent ? "justify-start" : "flex-row-reverse justify-start")}>
            <Avatar speaker={m.speaker} />
            <p
              className={cn(
                "animate-reveal max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                agent
                  ? "rounded-es-sm bg-accent-soft text-text-primary"
                  : "rounded-ee-sm bg-accent text-white",
              )}
            >
              {m.text}
            </p>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
