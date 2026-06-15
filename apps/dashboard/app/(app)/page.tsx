import { Suspense, type ReactNode } from "react";
import { VitalLine } from "@dawood/shared";
import { formatArabicDate } from "@/lib/format";
import { OverviewMasthead } from "./_overview/OverviewMasthead";
import { LiveCounters } from "./_overview/LiveCounters";
import { OverviewCharts } from "./_overview/OverviewCharts";
import { UCAutomationTiles } from "./_overview/UCAutomationTiles";
import { LatestConversations } from "./_overview/LatestConversations";
import { ActivityFeed } from "./_overview/ActivityFeed";

// Re-query on every visit (the overview is live operational data).
export const dynamic = "force-dynamic";

const TZ = process.env.DEFAULT_TIMEZONE || "Asia/Amman";

// A loading card in the Clinical Atelier vein: a recessed surface with a 200%-wide
// shimmer sweeping across it and a faint flatline VitalLine resting at the base.
function CardSkeleton() {
  return (
    <div className="relative h-28 overflow-hidden rounded-2xl border-hairline bg-surface">
      <span
        className="animate-shimmer absolute inset-0 w-[200%]"
        style={{
          background:
            "linear-gradient(100deg, transparent 20%, color-mix(in srgb, var(--color-text-primary) 6%, transparent) 45%, transparent 70%)",
        }}
        aria-hidden
      />
      <span className="absolute inset-x-0 bottom-3 px-5 opacity-40" aria-hidden>
        <VitalLine mode="static" height={14} color="color-mix(in srgb, var(--color-text-primary) 18%, transparent)" />
      </span>
    </div>
  );
}

function SectionSkeleton({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="relative mb-5 h-4 w-40 overflow-hidden rounded bg-surface">
        <span
          className="animate-shimmer absolute inset-0 w-[200%]"
          style={{
            background:
              "linear-gradient(100deg, transparent 20%, color-mix(in srgb, var(--color-text-primary) 8%, transparent) 45%, transparent 70%)",
          }}
          aria-hidden
        />
      </div>
      {children}
    </div>
  );
}

export default function OverviewPage() {
  // Rendered per request (force-dynamic) → a true "now" in the facility tz.
  const now = new Date();
  const dateAr = formatArabicDate(now, TZ);
  const dateEn = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <div>
      <OverviewMasthead date={{ ar: dateAr, en: dateEn }} />

      <div className="space-y-12">
        <Suspense
          fallback={
            <SectionSkeleton>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
            </SectionSkeleton>
          }
        >
          <LiveCounters />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3"><CardSkeleton /></div>
                <div className="lg:col-span-2"><CardSkeleton /></div>
              </div>
            </SectionSkeleton>
          }
        >
          <OverviewCharts />
        </Suspense>

        <Suspense fallback={<SectionSkeleton><CardSkeleton /></SectionSkeleton>}>
          <UCAutomationTiles />
        </Suspense>

        {/* Bottom broadsheet split: the call log reads wide, the activity rail narrow. */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Suspense fallback={<SectionSkeleton><CardSkeleton /></SectionSkeleton>}>
              <LatestConversations />
            </Suspense>
          </div>
          <div className="lg:col-span-2">
            <Suspense fallback={<SectionSkeleton><CardSkeleton /></SectionSkeleton>}>
              <ActivityFeed />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
