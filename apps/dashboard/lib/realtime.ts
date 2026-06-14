"use client";

import { getSupabaseBrowser } from "./supabase";
import type { Turn } from "./queries";

// Realtime channel helpers (publication set in migration 0006). Each opens a
// Supabase channel, fires `onInsert` on INSERT, and returns an unsubscribe fn.
// RLS applies via the logged-in admin session, so only admins receive rows.
// There is intentionally NO subscribeToSafetyEvents — Dawood writes safety
// events for audit but never displays them.

export function subscribeToCalls(
  onInsert: (row: { id: string; started_at: string }) => void,
): () => void {
  const supabase = getSupabaseBrowser();
  const channel = supabase
    .channel("dashboard:calls")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "conversations" },
      (payload) => {
        const r = payload.new as { id: string; started_at: string };
        onInsert({ id: r.id, started_at: r.started_at });
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToTurns(
  conversationId: string,
  onInsert: (row: Turn) => void,
): () => void {
  const supabase = getSupabaseBrowser();
  const channel = supabase
    .channel(`dashboard:turns:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "turns",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const r = payload.new as {
          id: string;
          speaker: "agent" | "user";
          text_raw: string | null;
          text_normalized: string | null;
          created_at: string;
        };
        onInsert({
          id: r.id,
          role: r.speaker,
          content_ar: r.text_raw ?? r.text_normalized ?? "",
          spoken_at: r.created_at,
        });
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToHandovers(
  onInsert: (row: { id: string; triggered_at: string; reason_code: string }) => void,
): () => void {
  const supabase = getSupabaseBrowser();
  const channel = supabase
    .channel("dashboard:handovers")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "handovers" },
      (payload) => {
        const r = payload.new as { id: string; triggered_at: string; reason_code: string };
        onInsert({ id: r.id, triggered_at: r.triggered_at, reason_code: r.reason_code });
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
