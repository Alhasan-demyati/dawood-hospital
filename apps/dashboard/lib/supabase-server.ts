import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Session-bound server client (anon key + the request's auth cookies). Reads
 * the logged-in admin's session. In a Server Component the cookie store is
 * read-only, so `setAll` is a best-effort no-op (token refresh happens in
 * middleware / the callback route, where cookies are writable).
 */
export function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — ignore (middleware refreshes).
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS. SERVER ONLY: this module top-level
 * imports next/headers, so importing it from a client component is a build
 * error (no `server-only` package needed). Every data-layer read in
 * lib/queries.ts and lib/kpis.ts goes through this.
 */
export function getSupabaseService() {
  return createClient(URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
