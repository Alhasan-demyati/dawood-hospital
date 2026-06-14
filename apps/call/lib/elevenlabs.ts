// ElevenLabs session config helper. Centralises the env read for the agent id,
// the (deliberate) websocket connection type, and the dynamic variables Salma
// needs at session start.
import { buildArabicDateInfo } from "./date-context";

// WebSocket, NOT webrtc — webrtc ICE negotiation times out behind some
// hospital / corporate networks. See step 05 agent settings.
export const ELEVENLABS_CONNECTION_TYPE = "websocket" as const;

// Non-NEXT_PUBLIC env vars are stripped from the client bundle, so this falls
// back to Amman in the browser. Production is always Asia/Amman regardless.
export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "Asia/Amman";

/** Public agent id (empty string when unset — the orb surfaces a clean error). */
export function getAgentId(): string {
  return process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";
}

export interface DynamicVarInput {
  language: "ar" | "en";
  now?: Date;
  tz?: string;
}

/**
 * Build the dynamicVariables map passed to `startSession`. `current_date_info`
 * grounds the agent's date math; `language` mirrors the active UI language so
 * the system prompt's `{{language}}` resolves correctly.
 */
export function buildDynamicVariables({
  language,
  now = new Date(),
  tz = DEFAULT_TIMEZONE,
}: DynamicVarInput): Record<string, string> {
  return {
    current_date_info: buildArabicDateInfo(now, tz),
    language,
  };
}
