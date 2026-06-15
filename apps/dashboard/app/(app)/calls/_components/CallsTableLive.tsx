"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConversationListItem } from "@/lib/queries";
import { ConversationsTable } from "@/components/ConversationsTable";
import { subscribeToCalls } from "@/lib/realtime";

// Wraps the shared table with a realtime subscription: on a new call INSERT,
// refresh the route (re-runs the server query) and softly highlight the new
// row for ~2s (the highlight fades via the table's transition-colors).
export function CallsTableLive({ rows }: { rows: ConversationListItem[] }) {
  const router = useRouter();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = subscribeToCalls((row) => {
      setHighlightId(row.id);
      router.refresh();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setHighlightId(null), 2000);
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  return (
    <div className="animate-reveal">
      <ConversationsTable rows={rows} highlightId={highlightId} />
    </div>
  );
}
