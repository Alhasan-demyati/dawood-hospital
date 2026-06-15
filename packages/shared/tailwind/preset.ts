import type { Config } from "tailwindcss";

/**
 * Shared Tailwind preset. Maps semantic class names onto the CSS variables
 * defined in styles/tokens.css, so theme switching is purely CSS-driven and
 * no colors are hardcoded in either app.
 */
const preset = {
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        "surface-3": "var(--color-surface-3)",
        "surface-raised": "var(--color-surface-raised)",
        "text-primary": "var(--color-text-primary)",
        "text-muted": "var(--color-text-muted)",
        "text-faint": "var(--color-text-faint)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        "accent-strong": "var(--color-accent-strong)",
        "accent-2": "var(--color-accent-2)",
        "accent-2-soft": "var(--color-accent-2-soft)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        hairline: "var(--color-hairline)",
        ring: "var(--color-ring)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
    },
  },
} satisfies Partial<Config>;

export default preset;
