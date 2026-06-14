# Specialty Triage Design — `suggest_specialty`

How the Dawood-specific triage feature turns a free-text Arabic chief complaint
into a recommended clinic — and how operations tune it **without a redeploy**.

> Schema reality vs the step-09 spec: the table is
> `chief_complaint_patterns(id, pattern_ar, pattern_en, specialty_id, weight, …)`
> — the matched column is **`pattern_ar`** (not `pattern`), and **`weight` is a
> `smallint` 1–5** (not a 1.0–1.5 float). The escalation paths below use the
> real `handovers.reason_code` / `safety_events.kind` allow-lists — the spec's
> `triage_no_match` / `triage_failed` are **not** valid values.

---

## 1. What it does

Converts a free-text Arabic chief complaint (e.g. "عندي ألم في الصدر وضيق نفس")
into one or two recommended specialty clinics with a confidence score, so the
agent can route the booking. Seven clinics: cardiology, ENT, internal medicine,
ophthalmology, pediatrics, dentistry, dermatology.

## 2. The data model

`public.chief_complaint_patterns`:

| Column | Notes |
|---|---|
| `id` | uuid |
| `pattern_ar` | Arabic phrase / keyword (NOT a regex). Matched against the complaint. |
| `pattern_en` | English mirror — ops review only; **not** used in matching. |
| `specialty_id` | FK → `specialties` |
| `weight` | `smallint` 1–5 — strength of the signal toward the specialty. |

~45 patterns are seeded across the seven clinics (some complaints cross-route to
two specialties with different weights). A GIN trigram index on `pattern_ar`
(`pg_trgm`) powers the match.

## 3. How `suggest_specialty` scores

Implemented by the `suggest_specialty_score(complaint text)` SQL function (see
`n8n/README.md`), called by the `suggest_specialty` n8n workflow:

1. **Trigram similarity** (`pg_trgm` `similarity()` / `%`) of each `pattern_ar`
   against the complaint.
2. **× weight** — `similarity * weight` per matching pattern.
3. **Group by specialty**, take the max/sum score per specialty.
4. Return the top specialties with a **normalised confidence in [0, 1]**
   (`top_confidence`, `top_specialty_id`, plus a `suggestions` list).

## 4. Confidence thresholds (used by the agent)

- **≥ 0.7** → propose a single specialty.
- **0.4 – 0.7** → offer the top two as a choice.
- **< 0.4** → ask the caller to pick from the seven clinics directly.

(These live in `elevenlabs/system_prompt.md`, playbook UC-D2.)

## 5. How to tune — SQL only, no redeploy

```sql
-- Add a pattern
insert into public.chief_complaint_patterns (pattern_ar, specialty_id, weight)
values ('ضيق نفس', '<cardiology id>', 3);

-- Strengthen / weaken a signal (weight is 1–5)
update public.chief_complaint_patterns set weight = 5 where pattern_ar = 'ألم في الصدر';

-- Remove a noisy pattern
delete from public.chief_complaint_patterns where id = '<id>';
```

Changes take effect on the next call — the workflow reads the table live.

## 6. When triage fails — three escalation paths

- **Empty suggestion set** → the agent falls back to the caller picking from
  the seven clinics directly. (There is no `safety_events(kind='triage_no_match')`
  — `safety_events.kind` only allows `guardrail_triggered | prompt_injection_attempt
  | pii_overshare | jailbreak`. To review low-match complaints, query
  `tool_calls where tool_name = 'suggest_specialty'` and inspect low
  `top_confidence` responses.)
- **Persistent low confidence across recent calls** → review those
  `suggest_specialty` tool calls monthly and add/adjust patterns.
- **Caller can't choose / repeated failure** → the agent calls
  `prepare_handover` with `reason_code = 'specialty_unclear'` (the real DB
  value; the spec's `triage_failed` is not allowed).

## 7. Clinical review

The seed pattern set is **clinical content, not engineering content**. A Dawood
physician should review it quarterly — pattern wording and weights encode triage
judgement and must stay clinically sound.
