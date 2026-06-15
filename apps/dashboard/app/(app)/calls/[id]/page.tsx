import {
  getConversation,
  getConversationTranscript,
  getConversationToolCalls,
} from "@/lib/queries";
import { PageHeader } from "@/components/editorial/PageHeader";
import { EmptyState } from "@/components/editorial/EmptyState";
import { CallDetailView } from "./_components/CallDetailView";

export const dynamic = "force-dynamic";

export default async function CallDetailPage({ params }: { params: { id: string } }) {
  const convo = await getConversation(params.id);

  // Friendly Arabic message inside the layout — NOT a 404 (per spec).
  if (!convo) {
    return (
      <div>
        <PageHeader kickerKey="kicker_call_detail" titleKey="call_detail_title" />
        <EmptyState variant="transcript" messageKey="call_detail_not_found" />
      </div>
    );
  }

  const [turns, tools] = await Promise.all([
    getConversationTranscript(convo.id),
    getConversationToolCalls(convo.id),
  ]);

  return <CallDetailView convo={convo} turns={turns} tools={tools} />;
}
