import { cn } from "../../lib/utils";

/*
 * A full-bleed atmospheric layer using the shared --gradient-mesh + grain
 * tokens. Drop into a `relative` container as a decorative backdrop (e.g. the
 * login card, the top bar wash). Server-safe.
 */

export function GradientMesh({
  className,
  grain = true,
}: {
  className?: string;
  grain?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        background: grain
          ? "var(--grain), var(--gradient-mesh)"
          : "var(--gradient-mesh)",
      }}
    />
  );
}
