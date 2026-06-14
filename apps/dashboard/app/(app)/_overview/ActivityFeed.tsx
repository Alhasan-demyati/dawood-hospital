import { getActivityFeed } from "@/lib/queries";
import { SectionTitle } from "@/components/editorial/SectionTitle";
import { ActivityFeedView } from "./ActivityFeedView";

// RSC: last 20 activity items (tool calls + handovers + booked visits).
export async function ActivityFeed() {
  const items = await getActivityFeed(20);
  return (
    <section>
      <SectionTitle titleKey="overview_activity_feed" />
      <ActivityFeedView initial={items} />
    </section>
  );
}
