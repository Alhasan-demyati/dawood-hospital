"use client";

import { useEffect, useState } from "react";
import { BigNumber } from "@/components/editorial/BigNumber";
import { subscribeToCalls } from "@/lib/realtime";

// Tiny client island: shows calls_today and bumps it on every realtime INSERT
// into `conversations`.
export function LiveCallsCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  // Reset to the server value when the route re-renders with fresh data.
  useEffect(() => setCount(initial), [initial]);

  useEffect(() => subscribeToCalls(() => setCount((c) => c + 1)), []);

  return <BigNumber labelKey="overview_counter_calls_today" value={count} accent="var(--color-accent)" iconKey="phone" delay={0} />;
}
