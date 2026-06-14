import type { TranslationKey } from "@dawood/shared";
import { getUCAutomationData } from "@/lib/queries";
import { Stat } from "@/components/editorial/Stat";
import { SectionTitle } from "@/components/editorial/SectionTitle";

const UC_LABEL: Record<string, TranslationKey> = {
  "UC-D1": "uc_d1",
  "UC-D2": "uc_d2",
  "UC-D3": "uc_d3",
  "UC-D4": "uc_d4",
};

const UC_ACCENT: Record<string, string> = {
  "UC-D1": "var(--color-accent)",
  "UC-D2": "#1f9d74",
  "UC-D3": "#0e7490",
  "UC-D4": "var(--color-accent-2)",
};

// RSC: 2×2 grid of automation-by-use-case cards (UC-D1..D4).
export async function UCAutomationTiles() {
  const rows = await getUCAutomationData();
  return (
    <section>
      <SectionTitle titleKey="overview_uc_tiles_title" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map((r, i) => (
          <Stat
            key={r.use_case}
            labelKey={UC_LABEL[r.use_case]}
            value={r.automation_pct}
            unit="%"
            progress={r.automation_pct}
            accentHex={UC_ACCENT[r.use_case]}
            delay={i + 1}
            subLabel={`${r.use_case} · ${r.automated}/${r.total}`}
          />
        ))}
      </div>
    </section>
  );
}
