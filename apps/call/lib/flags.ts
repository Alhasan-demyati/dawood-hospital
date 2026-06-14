// Env-driven feature flags for the call app. Both default to ON; set the env
// var to the string "false" to disable.
export const flags = {
  showTranscript: process.env.NEXT_PUBLIC_SHOW_TRANSCRIPT !== "false",
  showConsentBanner: process.env.NEXT_PUBLIC_SHOW_CONSENT_BANNER !== "false",
};
