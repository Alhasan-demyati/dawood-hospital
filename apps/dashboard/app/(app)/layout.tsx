import { DashboardShell } from "@/components/DashboardShell";
import { getSidebarStats } from "@/lib/queries";

// Re-query live sidebar stats on each navigation (they mirror the DB).
export const dynamic = "force-dynamic";

// POC shell — auth disabled, so the dashboard opens directly (no requireAuth).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const stats = await getSidebarStats();
  return <DashboardShell stats={stats}>{children}</DashboardShell>;
}
