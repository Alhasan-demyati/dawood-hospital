# Compliance — Dawood Hospital Voice Assistant

> ⚠ **REVIEW WITH LEGAL — Jordan MoH and a Jordanian data-protection attorney
> must sign off every section below before any real patient call.** This
> document is engineering's good-faith framing, **not** legal advice. Every
> regulatory claim is provisional until counsel confirms it.

Each section header carries an HTML `REVIEW WITH LEGAL` marker so a `grep`
finds them all.

---

## Regulatory regime <!-- REVIEW WITH LEGAL -->

Jordan Ministry of Health operational expectations around outpatient
appointment handling and call recording, plus the **Jordan Personal Data
Protection Law (PDP)** framing. The gazetted text, effective date, and the
controller/processor obligations must be confirmed by counsel. Out of scope by
design: diagnosis, medication/dosing advice, and any clinical decision-making.

## Data residency <!-- REVIEW WITH LEGAL -->

Supabase project in **EU-Frankfurt**; ElevenLabs **EU** region; n8n
self-hosted in the same region. There is no in-Jordan region option in this
pack — cross-border processing language and any data-localisation requirement
must be confirmed. Revisit if a Levant/in-country option becomes available or a
regulator requires in-country hosting.

## Consent capture <!-- REVIEW WITH LEGAL -->

Recording-consent question at call start:
**"هل تسمحون بتسجيل المكالمة لأغراض جودة الخدمة والتدريب؟"**. Captured per
conversation in `public.consent_log` (`consent_type = 'recording'`,
`value ∈ yes | no | unclear`). A **"لا"** triggers an immediate handover to the
human queue with `handovers.reason_code = 'consent_declined'` (the real
DB-allowed value; the step-09 spec's `caller_declined_recording` is not a valid
code). Wording and the consent-transfer flow must be vetted.

## Identification & PII rules <!-- REVIEW WITH LEGAL -->

Phone (E.164, +962) is the primary identifier, **confirmed digit-by-digit**
before any record lookup. The Jordanian national ID is **never** read aloud in
full (only a hash is stored — `patients.national_id_hash`). MRN is spelled
letter-by-letter, never bulk-read. Diagnosis, dosing, and medication advice are
out of scope and trigger an `out_of_scope` handover.

## Retention windows <!-- REVIEW WITH LEGAL -->

- Call recordings — **12 months**
- Transcripts — **24 months**
- Audit log — **7 years**, immutable / append-only (enforced by an
  UPDATE/DELETE trigger on `public.audit_log`).

Final numbers must be confirmed per Jordan MoH guidance.

## Access control <!-- REVIEW WITH LEGAL -->

Dashboard access is **Magic-Link** auth against the `public.admin_users`
allow-list (checked via the `is_dashboard_admin()` SECURITY DEFINER function).
The **service-role key is server-only** and never reaches the browser. PII
reads go through the server-side service client; the anon/browser client is
constrained by RLS (authenticated admins only) and never sees PII outside an
authenticated admin session.

## Audit <!-- REVIEW WITH LEGAL -->

`public.audit_log` is immutable: every write tool (book/reschedule/cancel and
the erasure flow) appends one row, and UPDATE/DELETE are blocked at the row
level by a trigger. There is no path to modify or delete an audit row from the
application.

## Data subject rights <!-- REVIEW WITH LEGAL -->

Erasure (right to be forgotten) is handled by
`scripts/delete_patient_data.mjs`: it deletes the `patients` row (cascading
`visits` + `visit_intake`), sets `conversations.patient_id` to NULL and
anonymises `caller_phone` for retention-protected telemetry, and **appends** an
`audit_log` erasure record. Because `audit_log` is append-only, audit rows are
**never deleted** — the erasure is recorded, not erased.

## Open items for legal review <!-- REVIEW WITH LEGAL -->

Explicit unknowns counsel must close before launch:

- (a) Confirm **Jordan PDP applicability** and any breach/notification windows.
- (b) Confirm **acceptable hosting region(s)** for patient data (EU-Frankfurt
  vs an in-country requirement).
- (c) Confirm the **recording-consent script wording** (Arabic) and the
  consent record of evidence.
- (d) Confirm the **retention windows** (12 / 24 months, 7-year audit) per
  Jordan MoH.
- (e) Confirm the **warm-transfer (handover) language** complies with consent
  and call-transfer rules.
