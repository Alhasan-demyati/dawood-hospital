import { getActivityFeed } from "@/lib/queries";
import { OverviewSection } from "./OverviewSection";
import { ActivityFeedView } from "./ActivityFeedView";

// RSC: last 20 activity items (tool calls + handovers + booked visits).
export async function ActivityFeed() {
  const items = await getActivityFeed(20);
  return (
    <section>
      <OverviewSection index={5} titleKey="overview_activity_feed" metaKey="overview_activity_sub" />
      <ActivityFeedView initial={items} />
    </section>
  );
}
