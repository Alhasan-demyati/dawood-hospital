import { ammanDayStart, countVisits, listSpecialties, listVisits } from "@/lib/queries";
import { kpiNoShowRate } from "@/lib/kpis";
import { toWesternDigits } from "@/lib/format";
import { firstParam, listParam, pageParam, parseDateParam, type SearchParams } from "@/lib/search-params";
import { PageHeader } from "@/components/editorial/PageHeader";
import { RefreshButton } from "@/components/editorial/RefreshButton";
import { Stat } from "@/components/editorial/Stat";
import { EmptyState } from "@/components/editorial/EmptyState";
import { Pagination } from "@/components/Pagination";
import { VisitsTable } from "@/components/VisitsTable";
import { VisitsFilters } from "./_components/VisitsFilters";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;
const DAY = 24 * 60 * 60 * 1000;

export default async function VisitsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageParam(searchParams.page);
  const now = new Date();
  // Default date window: next 7 days (upcoming).
  const from = parseDateParam(searchParams.from) ?? now;
  const to = parseDateParam(searchParams.to, true) ?? new Date(now.getTime() + 7 * DAY);
  const phoneRaw = firstParam(searchParams.phone);
  const phoneLast4 = phoneRaw ? toWesternDigits(phoneRaw).replace(/\D/g, "").slice(-4) || undefined : undefined;
  const status = listParam(searchParams.status);
  const specialtyId = firstParam(searchParams.specialtyId) || undefined;

  const todayStart = ammanDayStart(now);
  const todayEnd = new Date(todayStart.getTime() + DAY);

  const [specialties, rows, todayCount, next7Count, noShow30] = await Promise.all([
    listSpecialties(),
    listVisits({ status, specialtyId, from, to, phoneLast4, order: "asc", limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countVisits({ from: todayStart, to: todayEnd }),
    countVisits({ from: now, to: new Date(now.getTime() + 7 * DAY) }),
    kpiNoShowRate(30),
  ]);

  return (
    <div>
      <PageHeader
        kickerKey="kicker_visits"
        titleKey="visits_page_title"
        subtitleKey="visits_page_sub"
        actions={<RefreshButton />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat labelKey="visits_kpi_today" value={todayCount} />
        <Stat labelKey="visits_kpi_upcoming7" value={next7Count} />
        <Stat labelKey="visits_kpi_noshow30" value={noShow30} unit="%" />
      </div>

      <VisitsFilters specialties={specialties} />
      {rows.length ? <VisitsTable rows={rows} /> : <EmptyState messageKey="visits_empty" variant="visits" />}
      <Pagination page={page} hasNext={rows.length === PAGE_SIZE} />
    </div>
  );
}
