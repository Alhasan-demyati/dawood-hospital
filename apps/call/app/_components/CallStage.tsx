"use client";

import { useCallback, useRef, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { useLanguage } from "@dawood/shared";
import { CallOrb } from "./CallOrb";
import { TranscriptStream, type TranscriptBubble } from "./TranscriptStream";
import { flags } from "@/lib/flags";

/**
 * Client island that hosts the ElevenLabs ConversationProvider (required by
 * `useConversation`) and lifts the shared transcript state so the orb and the
 * transcript stream stay in sync. page.tsx remains a server component and drops
 * this island into a slot.
 */
export function CallStage({ agentId }: { agentId: string }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<TranscriptBubble[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const idRef = useRef(0);

  const pushMessage = useCallback((speaker: "user" | "agent", text: string) => {
    setMessages((prev) => [...prev, { id: idRef.current++, speaker, text }]);
  }, []);

  // Each new call starts with a fresh transcript (documented in the step-07 report).
  const clearMessages = useCallback(() => setMessages([]), []);

  return (
    <ConversationProvider>
      <div className="flex w-full flex-col items-center gap-6">
        {banner && (
          <div
            role="alert"
            className="w-full rounded-md border border-danger bg-surface px-4 py-2 text-center text-sm text-danger"
          >
            {banner}
          </div>
        )}

        <CallOrb
          agentId={agentId}
          onMessage={pushMessage}
          onBanner={setBanner}
          onCallStart={clearMessages}
        />

        {flags.showTranscript && <TranscriptStream messages={messages} />}
      </div>
    </ConversationProvider>
  );
}

// Re-exported so consumers can import the bubble type alongside the stage.
export type { TranscriptBubble };
