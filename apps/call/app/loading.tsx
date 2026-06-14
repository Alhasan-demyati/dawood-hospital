import { dict } from "@dawood/shared";

// Route-level loading fallback. Server component, so it uses the Arabic default
// copy (no client language context available here).
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-text-muted">
      <p className="animate-pulse-dot text-sm">{dict.ar.common_loading}</p>
    </main>
  );
}
