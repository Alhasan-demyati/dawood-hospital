import type { Config } from "tailwindcss";
import sharedPreset from "../../packages/shared/tailwind/preset";

const config: Config = {
  presets: [sharedPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/shared/**/*.{ts,tsx}",
  ],
};

export default config;
