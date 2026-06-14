import { getLiveCounters } from "@/lib/queries";
import { BigNumber } from "@/components/editorial/BigNumber";
import { LiveCallsCounter } from "./LiveCallsCounter";

// RSC: fetches today's counters via the service client; calls_today is wrapped
// in a client island so realtime inserts bump it live.
export async function LiveCounters() {
  const c = await getLiveCounters();
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <LiveCallsCounter initial={c.calls_today} />
      <BigNumber labelKey="overview_counter_containment" value={c.contained_pct} unit="%" accent="#1f9d74" iconKey="shield" delay={1} />
      <BigNumber labelKey="overview_counter_handovers_today" value={c.handovers_today} accent="#0e7490" iconKey="handover" delay={2} />
      <BigNumber labelKey="overview_counter_ces_today" value={c.ces_avg_today} accent="var(--color-accent-2)" iconKey="smile" delay={3} />
    </div>
  );
}
