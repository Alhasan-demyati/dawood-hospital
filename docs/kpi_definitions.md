# KPI Definitions — Dawood Hospital Dashboard

Every KPI on the overview page, defined against the **real** schema. This pack
does **not** use materialized KPI views (those were dropped in step 03) — the
overview tiles run small `count(*)` / `avg()` queries directly against the
operational tables via `getSupabaseService()` (`apps/dashboard/lib/kpis.ts`).

> Schema reality vs the step-09 spec: there is **no `calls` table** — call
> telemetry lives in **`conversations`**. CES is **`outcomes.ces`** /
> `customer_feedback.ces` (not `customer_feedback.score`). `conversations.outcome`
> is the enum `completed_automated | completed_with_handover | abandoned | error`
> (not `resolved`/`book_visit_success`/…). All formulas below use the real names.
> "Today" means the Asia/Amman calendar day (UTC+3, no DST).

---

## Overview tiles (the four live counters)

### مكالمات اليوم — Calls today
- **Source:** `count(*) from conversations where started_at >= <Amman day start>`
- **Refresh:** realtime — a Supabase Realtime `conversations` INSERT bumps the
  counter live (`subscribeToCalls`); also recomputed on page load (force-dynamic).
- **Interpretation:** volume signal; compare against the same weekday.

### نسبة الاحتواء — Containment rate
- **Source:** `count(outcome = 'completed_automated') / count(outcome is not null)` today, as a percent.
- **Formula:** automated completions ÷ all conversations that reached a final outcome.
- **Refresh:** on page load.
- **Good:** above ~70%. **Investigate:** below ~50% (too many handovers/abandons).

### تحويلات اليوم — Handovers today
- **Source:** `count(*) from handovers where triggered_at >= <Amman day start>`
- **Refresh:** on page load (the `/handovers` page streams new rows live).
- **Interpretation:** rising handovers = the assistant is escalating more; cross-check reason codes.

### متوسط رضا اليوم — Avg. CES today
- **Source:** `avg(ces) from outcomes where created_at >= <Amman day start> and ces is not null`
  (CES scale 1–10). Returns `—` when no ratings captured.
- **Refresh:** on page load.
- **Good:** higher is better; investigate a downward trend.

## UC automation tiles (UC-D1…UC-D4)

- **Source:** `outcomes` grouped by `use_case` over a trailing 30-day window:
  `total = count(*)`, `automated = count(goal_achieved = true)`, `pct = automated/total`.
- The four Dawood use cases: **UC-D1** FAQ, **UC-D2** booking + triage,
  **UC-D3** reschedule/cancel/status, **UC-D4** multi-intent.

## Additional KPIs (queryable; surfaced on `/visits` or via SQL)

### نسبة عدم الحضور — No-show rate (30 days)
- **Source:** `count(status='no_show') / count(*)` over visits with
  `scheduled_start` in the last 30 days (`kpiNoShowRate(30)`), as a percent.
- **Surfaced:** the `/visits` KPI strip.

### زيارات اليوم / خلال السبعة أيام القادمة — Visits today / next 7 days
- **Source:** `count(*) from visits` within the Amman-day / next-7-day window
  (`countVisits(...)`). Surfaced on the `/visits` KPI strip.

### توزيع العيادات — Specialty distribution
- **Source:** `count(*) from visits group by specialty_id` (join `specialties`
  for the Arabic name). Available via SQL; not a dedicated tile.

### متوسط زمن المعالجة (AHT) — Average Handling Time *(optional)*
- **Source:** `avg(extract(epoch from (ended_at - started_at))) from conversations`
  where `ended_at is not null` and started today. Not shown on the current
  overview; documented for completeness.
