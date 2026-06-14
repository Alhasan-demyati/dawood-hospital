# Dawood Hospital — Knowledge Base (قاعدة المعرفة)

## 1. What this folder contains

17 Arabic markdown articles + this README. Articles **01–10** cover generic
hospital information (hours, location, what to bring, payment, insurance,
new-patient prerequisites, cancellation, privacy, emergency, and a clinics
overview). Articles **11–17** are one-per-specialty mini-articles tied to
Dawood's 7 clinics. All article bodies are Arabic; frontmatter keys are
English. The articles ground the ElevenLabs agent for **UC-D1 (FAQ)** and
support the specialty-triage flow in **UC-D2**.

## 2. Upload steps to ElevenLabs

Index these into the agent's Knowledge Base with:

- Semantic chunking: **chunk size 512**, **overlap 64**
- Retrieval: **top-K 3**, **similarity threshold 0.30**
- Language: **`ar`**

Upload via the script that step 09 produces
(`scripts/deploy_elevenlabs.mjs`) — **not by hand** — so the chunking and
metadata stay consistent across re-uploads.

## 3. Categories

**Generic (10):** `hours`, `location`, `what_to_bring`, `payment`,
`insurance_partners`, `visit_prereq`, `cancellation_policy`,
`privacy_recording`, `emergency_redirect`, `specialties_overview`.

**Specialty (7):** `specialty_cardiology`, `specialty_ent`,
`specialty_internal_medicine`, `specialty_ophthalmology`,
`specialty_pediatrics`, `specialty_dentistry`, `specialty_dermatology`.

## 4. Body structure (every article)

Each article follows the same three mandatory sections, in order:

1. **ملخص قصير** — a 2–3 sentence plain-Arabic summary.
2. **التفاصيل** — concrete bullet details (conditions, exceptions, examples).
3. **متى نحوّل إلى موظف بشري** — explicit handover triggers for the agent.

Body copy uses Arabic-Indic numerals (٠–٩); phone numbers and reference
identifiers stay in Western digits.

## 5. Test queries (Arabic)

| Arabic query | Expected article |
|---|---|
| متى تفتح العيادات؟ | 01_visiting_hours |
| كم تكلفة الزيارة؟ | 04_payment (note: no prices, just channels) |
| ما هي العيادات المتوفرة؟ | 10_specialties_overview |
| لدي ألم في الصدر، أي عيادة؟ | 11_specialty_cardiology |
| طفلي يعاني من الحرارة | 15_specialty_pediatrics |
| كيف ألغي موعدًا؟ | 07_cancellation_policy |
| في حالة طوارئ ماذا أفعل؟ | 09_emergency_redirect |
| هل تقبلون تأميني؟ | 05_insurance_partners |

## 6. Versioning

Re-upload changed files to ElevenLabs after every edit; the git copy is the
source of truth for review.

## 7. Compliance caveat

Not legally vetted. Review with Jordan MoH guidelines and Dawood Hospital
administration before customer-facing launch. Every article carries
`review_required: true`, and consent/retention-touching articles
(`05_insurance_partners`, `08_privacy_recording`) carry inline
`REVIEW WITH LEGAL` comments.
