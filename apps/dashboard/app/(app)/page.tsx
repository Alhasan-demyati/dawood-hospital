import { Suspense } from "react";
import { PageHeader } from "@/components/editorial/PageHeader";
import { RefreshButton } from "@/components/editorial/RefreshButton";
import { LiveCounters } from "./_overview/LiveCounters";
import { OverviewCharts } from "./_overview/OverviewCharts";
import { UCAutomationTiles } from "./_overview/UCAutomationTiles";
import { LatestConversations } from "./_overview/LatestConversations";
import { ActivityFeed } from "./_overview/ActivityFeed";

// Re-query on every visit (the overview is live operational data).
export const dynamic = "force-dynamic";

function CardSkeleton() {
  return <div className="h-28 animate-pulse rounded-lg border border-border bg-surface" />;
}

export default function OverviewPage() {
  return (
    <div>
      <PageHeader titleKey="nav_overview" actions={<RefreshButton />} />
      <div className="space-y-10">
        <Suspense fallback={<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>}>
          <LiveCounters />
        </Suspense>
        <Suspense fallback={<div className="grid grid-cols-1 gap-4 lg:grid-cols-5"><div className="lg:col-span-3"><CardSkeleton /></div><div className="lg:col-span-2"><CardSkeleton /></div></div>}>
          <OverviewCharts />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <UCAutomationTiles />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <LatestConversations />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <ActivityFeed />
        </Suspense>
      </div>
    </div>
  );
}
