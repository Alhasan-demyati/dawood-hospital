import { cn } from "@dawood/shared";

// Themed full-width rule. No hooks/text → works in server or client trees.
// `tone` picks the separator weight: "border" (default, structural) or
// "hairline" (faint in-card lead-in).
export function RuleLine({
  className,
  tone = "border",
}: {
  className?: string;
  tone?: "hairline" | "border";
}) {
  return (
    <hr
      className={cn(
        "border-0 border-t",
        tone === "hairline" ? "border-hairline" : "border-border",
        className,
      )}
    />
  );
}
