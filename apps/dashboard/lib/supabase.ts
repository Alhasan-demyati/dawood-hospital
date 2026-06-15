"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser (anon) client — safe to expose; RLS + the logged-in session cookie
// scope what it can read. Used by the realtime helpers in client components.
// Memoised so repeated calls reuse one channel-multiplexed connection.
type BrowserClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserClient | null = null;

// When the public env vars are missing (e.g. a dev server started before the
// keys were filled in), createBrowserClient throws — which would crash any
// client island that opens a realtime channel in an effect, taking the whole
// page down. Degrade gracefully instead: a no-op channel stub so realtime
// simply goes quiet ("no live updates") and every page still renders.
function noopRealtimeStub(): BrowserClient {
  const channel = () => {
    const ch: Record<string, unknown> = {};
    ch.on = () => ch;
    ch.subscribe = () => ch;
    ch.unsubscribe = () => Promise.resolve("ok");
    return ch;
  };
  return {
    channel,
    removeChannel: () => Promise.resolve("ok"),
    removeAllChannels: () => Promise.resolve("ok"),
  } as unknown as BrowserClient;
}

export function getSupabaseBrowser() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) {
    if (typeof console !== "undefined") {
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY missing — realtime disabled (static data only).",
      );
    }
    browserClient = noopRealtimeStub();
    return browserClient;
  }
  browserClient = createBrowserClient(url, anon);
  return browserClient;
}
