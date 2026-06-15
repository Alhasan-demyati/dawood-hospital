import { listConversations } from "@/lib/queries";
import { toWesternDigits } from "@/lib/format";
import { firstParam, pageParam, parseDateParam, type SearchParams } from "@/lib/search-params";
import { PageHeader } from "@/components/editorial/PageHeader";
import { RefreshButton } from "@/components/editorial/RefreshButton";
import { EmptyState } from "@/components/editorial/EmptyState";
import { Pagination } from "@/components/Pagination";
import { CallsFilters } from "./_components/CallsFilters";
import { CallsTableLive } from "./_components/CallsTableLive";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export default async function CallsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageParam(searchParams.page);
  // Default date window: last 24h.
  const from = parseDateParam(searchParams.from) ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = parseDateParam(searchParams.to, true);
  const phoneRaw = firstParam(searchParams.phone);
  const phoneLast4 = phoneRaw
    ? toWesternDigits(phoneRaw).replace(/\D/g, "").slice(-4) || undefined
    : undefined;

  const rows = await listConversations({
    from,
    to,
    outcome: firstParam(searchParams.outcome) || undefined,
    useCase: firstParam(searchParams.uc) || undefined,
    phoneLast4,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <div>
      <PageHeader
        kickerKey="kicker_calls"
        titleKey="calls_page_title"
        subtitleKey="calls_page_sub"
        actions={<RefreshButton />}
      />
      <CallsFilters />
      {rows.length ? (
        <CallsTableLive rows={rows} />
      ) : (
        <EmptyState messageKey="calls_empty" variant="calls" />
      )}
      <Pagination page={page} hasNext={rows.length === PAGE_SIZE} />
    </div>
  );
}
