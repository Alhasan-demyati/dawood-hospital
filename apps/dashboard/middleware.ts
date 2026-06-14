import { NextResponse } from "next/server";

// Auth is DISABLED for the POC — the dashboard opens directly (no login gate).
// To re-enable Magic Link auth later, restore the session check here and the
// requireAuth() call in app/(app)/layout.tsx.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|api/public).*)"],
};
