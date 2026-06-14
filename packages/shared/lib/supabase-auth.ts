// Magic Link auth stub for the dashboard. Real Supabase wiring lands in step 08.
// REVIEW WITH LEGAL: sign-in flow + admin_users gating are compliance-touching.

export interface MagicLinkResult {
  ok: boolean;
  error?: string;
}

/**
 * Send a Magic Link sign-in email. Currently a stub.
 *
 * @param email destination address for the sign-in link
 */
export async function sendMagicLink(email: string): Promise<MagicLinkResult> {
  // TODO: implement in step 08 — Supabase @supabase/ssr signInWithOtp({ email }).
  if (!email || !email.includes("@")) {
    return { ok: false, error: "INVALID_EMAIL" };
  }
  return { ok: false, error: "NOT_IMPLEMENTED" };
}
