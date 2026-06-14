import { cn } from "@dawood/shared";

// Themed full-width rule. No hooks/text → works in server or client trees.
export function RuleLine({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-border", className)} />;
}
