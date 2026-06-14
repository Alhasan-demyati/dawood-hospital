import { getLatestConversations } from "@/lib/queries";
import { SectionTitle } from "@/components/editorial/SectionTitle";
import { EmptyState } from "@/components/editorial/EmptyState";
import { ConversationsTable } from "@/components/ConversationsTable";

// RSC: 10 most-recent conversations → /calls/[id].
export async function LatestConversations() {
  const rows = await getLatestConversations(10);
  return (
    <section>
      <SectionTitle titleKey="overview_latest_conversations" />
      {rows.length ? <ConversationsTable rows={rows} /> : <EmptyState messageKey="calls_empty" />}
    </section>
  );
}
