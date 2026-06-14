import { listHandovers } from "@/lib/queries";
import { firstParam, listParam, pageParam, parseDateParam, type SearchParams } from "@/lib/search-params";
import { PageHeader } from "@/components/editorial/PageHeader";
import { RefreshButton } from "@/components/editorial/RefreshButton";
import { EmptyState } from "@/components/editorial/EmptyState";
import { Pagination } from "@/components/Pagination";
import { HandoversFilters } from "./_components/HandoversFilters";
import { HandoversTable } from "./_components/HandoversTable";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;
const DAY = 24 * 60 * 60 * 1000;

export default async function HandoversPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageParam(searchParams.page);
  const now = new Date();
  // Default date window: last 7 days.
  const from = parseDateParam(searchParams.from) ?? new Date(now.getTime() - 7 * DAY);
  const to = parseDateParam(searchParams.to, true);
  const reasonCode = listParam(searchParams.reason);
  const statusParam = firstParam(searchParams.status);
  const status = statusParam === "open" || statusParam === "completed" ? statusParam : undefined;

  const rows = await listHandovers({
    reasonCode,
    status,
    from,
    to,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <div>
      <PageHeader titleKey="handovers_page_title" actions={<RefreshButton />} />
      <HandoversFilters />
      {rows.length ? <HandoversTable rows={rows} /> : <EmptyState messageKey="handovers_empty" />}
      <Pagination page={page} hasNext={rows.length === PAGE_SIZE} />
    </div>
  );
}
