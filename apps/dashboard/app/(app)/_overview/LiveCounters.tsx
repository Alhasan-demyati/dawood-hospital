import { getLiveCounters } from "@/lib/queries";
import { BigNumber } from "@/components/editorial/BigNumber";
import { LiveCallsCounter } from "./LiveCallsCounter";
import { OverviewSection } from "./OverviewSection";

// RSC: fetches today's counters via the service client; calls_today is wrapped
// in a client island so realtime inserts bump it live.
export async function LiveCounters() {
  const c = await getLiveCounters();
  return (
    <section>
      <OverviewSection index={1} titleKey="overview_vitals_title" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <LiveCallsCounter initial={c.calls_today} />
      <BigNumber labelKey="overview_counter_containment" value={c.contained_pct} unit="%" accent="#1f9d74" iconKey="shield" motif="shield" meter={c.contained_pct} delay={1} />
      <BigNumber labelKey="overview_counter_handovers_today" value={c.handovers_today} accent="#0e7490" iconKey="handover" motif="handover" delay={2} />
      <BigNumber labelKey="overview_counter_ces_today" value={c.ces_avg_today} accent="var(--color-accent-2)" iconKey="smile" motif="heart" scale={{ value: c.ces_avg_today, max: 10 }} delay={3} />
      </div>
    </section>
  );
}
