import { cn } from "../../lib/utils";
import { MedicalGlyph, type GlyphName } from "./MedicalGlyph";

/*
 * A faint oversized glyph watermark for masthead / section corners. Decorative
 * only (very low opacity), painted in the accent color. Server-safe.
 */

export function SectionMotif({
  name = "cross",
  className,
  size = 150,
  drift = false,
}: {
  name?: GlyphName;
  className?: string;
  size?: number;
  drift?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute text-accent opacity-[0.05]",
        drift && "motif-drift",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <MedicalGlyph name={name} className="h-full w-full" strokeWidth={1.1} />
    </span>
  );
}
