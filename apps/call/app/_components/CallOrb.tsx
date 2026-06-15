"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { useLanguage } from "@dawood/shared";
import { buildDynamicVariables, ELEVENLABS_CONNECTION_TYPE } from "@/lib/elevenlabs";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

function MicGlyph({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

function MicOffGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M9 9v2a3 3 0 0 0 5 2.2M15 11V6a3 3 0 0 0-5.6-1.5M5 11a7 7 0 0 0 10.5 6.1M12 18v3" strokeLinecap="round" />
      <path d="M4 4l16 16" strokeLinecap="round" />
    </svg>
  );
}

function PhoneEndGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M3 10.5c5.5-3 12-3 17.5 0l-2 3-3.2-1.2-.4-2.4a14 14 0 0 0-6.3 0l-.4 2.4L5 13.5z" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The voice orb — start / end affordance + the live visualizer. Owns the
 * ElevenLabs `useConversation` hook; exposes Mute + End controls while a call
 * is active. Must be rendered inside a ConversationProvider.
 */
export function CallOrb({
  agentId,
  onMessage,
  onBanner,
  onCallStart,
}: {
  agentId: string;
  onMessage: (speaker: "user" | "agent", text: string) => void;
  onBanner: (msg: string | null) => void;
  onCallStart: () => void;
}) {
  const { lang, t } = useLanguage();
  const [errorFlash, setErrorFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setErrorFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setErrorFlash(false), 900);
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const conversation = useConversation({
    connectionType: ELEVENLABS_CONNECTION_TYPE,
    onConnect: () => onBanner(null),
    // When the call ends — including the agent hanging up via the `end_call`
    // system tool — clear any banner and let the orb fall back to idle (its
    // state derives from `conversation.status`, which becomes "disconnected").
    onDisconnect: () => onBanner(null),
    onMessage: (m) => onMessage(m.source === "user" ? "user" : "agent", m.message),
    onError: () => {
      onBanner(t("callOrb_error"));
      flash();
    },
  });

  const status = conversation.status; // disconnected | connecting | connected | error
  const connected = status === "connected";
  const connecting = status === "connecting";
  const active = connected || connecting;
  const muted = conversation.isMuted;

  const orbState: OrbState =
    errorFlash || status === "error"
      ? "error"
      : connecting
        ? "connecting"
        : connected && conversation.isSpeaking
          ? "speaking"
          : connected
            ? "listening"
            : "idle";

  const hint =
    orbState === "connecting"
      ? t("call_connecting")
      : orbState === "speaking"
        ? t("callOrb_speaking")
        : orbState === "listening"
          ? t("callOrb_listening")
          : orbState === "error"
            ? t("callOrb_error")
            : t("callOrb_idle_hint");

  const toggleCall = useCallback(async () => {
    if (connected || connecting) {
      conversation.endSession();
      return;
    }
    if (!agentId) {
      onBanner(t("callOrb_error"));
      flash();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onBanner(t("mic_permission_needed"));
      flash();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      onBanner(t("mic_permission_needed"));
      flash();
      return;
    }
    onBanner(null);
    onCallStart();
    conversation.startSession({
      agentId,
      connectionType: ELEVENLABS_CONNECTION_TYPE,
      // Force the conversation to OPEN in the UI language (English by default).
      // The agent's primary language is Arabic (so it can use the fast
      // multilingual `turbo_v2_5` model — English-primary agents are capped to
      // the slower multilingual_v2), so we must override the start language per
      // call; the caller can still switch in-call via language_detection.
      overrides: { agent: { language: lang } },
      dynamicVariables: buildDynamicVariables({ language: lang }),
    });
  }, [agentId, connected, connecting, conversation, lang, t, onBanner, onCallStart, flash]);

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        type="button"
        onClick={toggleCall}
        className="voice-orb"
        data-state={orbState}
        aria-pressed={active}
        aria-busy={connecting}
        aria-label={active ? t("call_end") : t("callOrb_idle_hint")}
      >
        <span className="orb-aura" aria-hidden />
        <span className="orb-ring r1" aria-hidden />
        <span className="orb-ring r2" aria-hidden />
        <span className="orb-ring r3" aria-hidden />
        <span className="orb-halo" aria-hidden />
        <span className="orb-halo orb-halo-2" aria-hidden />
        <span className="orb-orbit" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="orb-spinner" aria-hidden />
        <span className="orb-core">
          <span className="orb-shimmer" aria-hidden />
          {orbState === "speaking" ? (
            <span className="orb-eq" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : (
            <span className="orb-glyph" aria-hidden>
              <MicGlyph />
            </span>
          )}
        </span>
      </button>

      <span className="orb-status" data-state={orbState} aria-live="polite">
        <i className="orb-dot" aria-hidden />
        {hint}
      </span>

      {active && (
        <div className="orb-controls">
          <button
            type="button"
            className="orb-ctrl"
            data-on={muted}
            disabled={!connected}
            onClick={() => conversation.setMuted(!muted)}
            aria-pressed={muted}
          >
            {muted ? <MicOffGlyph /> : <MicGlyph size={18} />}
            {muted ? t("call_unmute") : t("call_mute")}
          </button>
          <button type="button" className="orb-ctrl orb-ctrl-danger" onClick={() => conversation.endSession()}>
            <PhoneEndGlyph />
            {t("call_end")}
          </button>
        </div>
      )}
    </div>
  );
}
