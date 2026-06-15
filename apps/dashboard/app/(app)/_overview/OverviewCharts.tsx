import type { TranslationKey } from "@dawood/shared";
import { getVisitsTrend, getSpecialtyBreakdown, getStatusBreakdown } from "@/lib/queries";
import { OverviewSection } from "./OverviewSection";
import { ChartCard } from "@/components/charts/ChartCard";
import { TrendBars } from "@/components/charts/TrendBars";
import { Donut, type DonutSlice } from "@/components/charts/Donut";
import { SpecialtyBars } from "@/components/charts/SpecialtyBars";

const STATUS_META: Record<string, { labelKey: TranslationKey; color: string }> = {
  scheduled: { labelKey: "status_scheduled", color: "var(--color-accent)" },
  checked_in: { labelKey: "status_checked_in", color: "#0e7490" },
  in_room: { labelKey: "status_in_room", color: "var(--color-accent-2)" },
  discharged: { labelKey: "status_discharged", color: "#1f9d74" },
  cancelled: { labelKey: "status_cancelled", color: "var(--color-danger)" },
  no_show: { labelKey: "status_no_show", color: "var(--color-warning)" },
};

// RSC: visit analytics — three DB-reflected charts (trend, status mix, by clinic).
export async function OverviewCharts() {
  const [trend, specialties, statuses] = await Promise.all([
    getVisitsTrend(7),
    getSpecialtyBreakdown(),
    getStatusBreakdown(),
  ]);

  const slices: DonutSlice[] = statuses.map((s) => ({
    key: s.status,
    labelKey: STATUS_META[s.status]?.labelKey ?? "status_scheduled",
    value: s.count,
    color: STATUS_META[s.status]?.color ?? "var(--color-accent)",
  }));

  return (
    <section>
      <OverviewSection index={2} titleKey="charts_section" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ChartCard titleKey="chart_trend_title" subKey="chart_trend_sub" accent="var(--color-accent)" className="lg:col-span-3">
          <TrendBars points={trend} accent="var(--color-accent)" />
        </ChartCard>
        <ChartCard titleKey="chart_status_title" subKey="chart_status_sub" accent="#1f9d74" delay={1} className="lg:col-span-2">
          <Donut slices={slices} totalLabelKey="chart_total" />
        </ChartCard>
        <ChartCard titleKey="chart_specialty_title" subKey="chart_specialty_sub" accent="var(--color-accent-2)" delay={2} className="lg:col-span-5">
          <SpecialtyBars rows={specialties} />
        </ChartCard>
      </div>
    </section>
  );
}
