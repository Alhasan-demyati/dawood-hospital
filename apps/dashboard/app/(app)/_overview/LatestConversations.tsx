import { getLatestConversations } from "@/lib/queries";
import { OverviewSection } from "./OverviewSection";
import { EmptyState } from "@/components/editorial/EmptyState";
import { ConversationsTable } from "@/components/ConversationsTable";

// RSC: 10 most-recent conversations → /calls/[id].
export async function LatestConversations() {
  const rows = await getLatestConversations(10);
  return (
    <section>
      <OverviewSection index={4} titleKey="overview_latest_conversations" metaKey="overview_latest_sub" />
      {rows.length ? <ConversationsTable rows={rows} /> : <EmptyState messageKey="calls_empty" />}
    </section>
  );
}
