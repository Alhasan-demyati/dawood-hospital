// Server-only by construction (imports supabase-server → next/headers); a
// client import would fail to build. Not using the `server-only` package to
// avoid adding a dependency.
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseServer, getSupabaseService } from "./supabase-server";

export type { User };
export type AdminUser = {
  id: string;
  email: string;
  role: string;
  active: boolean;
};

/**
 * Gate every authed page. Returns the session user + their admin_users row, or
 * redirects (which throws — never wrap in try/catch). NOTE: `getSession()` is
 * used per the step-08 spec; `getUser()` is the more-hardened choice if this
 * graduates past POC. The admin check is case-insensitive to match
 * is_dashboard_admin() (migration 0005).
 */
export async function requireAuth(): Promise<{ user: User; adminUser: AdminUser }> {
  const supabase = getSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const service = getSupabaseService();
  const { data: admin } = await service
    .from("admin_users")
    .select("id, email, role, active")
    .ilike("email", session.user.email ?? "")
    .eq("active", true)
    .maybeSingle();

  if (!admin) redirect("/login?error=not_authorized");
  return { user: session.user, adminUser: admin as AdminUser };
}
