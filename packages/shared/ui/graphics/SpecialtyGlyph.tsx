import { cn } from "../../lib/utils";
import { MedicalGlyph, type GlyphName } from "./MedicalGlyph";

/*
 * A small tinted glyph chip for a clinical specialty. The color comes from the
 * DB `color_hex` (the one allowed data-driven color), so the palette stays
 * authentic to the data. Server-safe.
 */

export function SpecialtyGlyph({
  color = "var(--color-accent)",
  name = "pulse",
  className,
}: {
  color?: string;
  name?: GlyphName;
  className?: string;
}) {
  return (
    <span
      className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md", className)}
      style={{
        background: `color-mix(in srgb, ${color} 15%, var(--color-surface))`,
        color,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)`,
      }}
      aria-hidden
    >
      <MedicalGlyph name={name} className="h-3.5 w-3.5" strokeWidth={1.9} />
    </span>
  );
}
