// Barrel for @dawood/shared. Apps import from here or from deep paths
// (e.g. "@dawood/shared/i18n"). CSS lives under ./styles and is imported
// directly by each app's globals.css.

export * from "./i18n";
export * from "./theme";
export * from "./lib/utils";
export { sendMagicLink } from "./lib/supabase-auth";
export type { MagicLinkResult } from "./lib/supabase-auth";
export * from "./ui";
