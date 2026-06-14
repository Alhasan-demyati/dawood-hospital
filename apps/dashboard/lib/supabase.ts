"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser (anon) client — safe to expose; RLS + the logged-in session cookie
// scope what it can read. Used by the realtime helpers in client components.
// Memoised so repeated calls reuse one channel-multiplexed connection.
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  browserClient = createBrowserClient(url, anon);
  return browserClient;
}
