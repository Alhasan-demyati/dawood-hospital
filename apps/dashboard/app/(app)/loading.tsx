// Editorial loading skeleton for the authed routes.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-surface" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
    </div>
  );
}
