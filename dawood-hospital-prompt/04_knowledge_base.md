<!-- Dawood Hospital simplification of hospitals/04_knowledge_base.md
     drops: 30→17 articles; removes lab/imaging, refills, pre-auth, post-vaccine, home visits,
            inpatient admission, after-hours-nurse, referral-network, accessibility-as-separate,
            walk-in, complaints-as-separate, wait-times, fasting, confirmation-reminders,
            physicians-list, faq-shortlist, KSA/UAE-emergency-numbers (911/998)
     adds: specialties_overview (NEW article tying to suggest_specialty),
           7 specialty mini-articles (~150 words each) cross-referencing the overview,
           Jordan emergency number (911), Jordanian payer names -->

# STEP 04 — Knowledge Base (17 Arabic articles)

> Prerequisites: steps 01–03 complete. Verify `supabase/migrations/`
> contains 6 files and the seed inserts ran (7 rows in `specialties`).
>
> Scope of THIS prompt: write 17 markdown articles in Arabic for the
> Dawood Hospital voicebot's Knowledge Base, plus a KB README. This step
> does NOT touch the system prompt or tool schemas — those come in step 05.

## What to produce

```
elevenlabs/
└── kb/
    ├── README.md
    ├── 01_visiting_hours.md
    ├── 02_location_parking.md
    ├── 03_what_to_bring.md
    ├── 04_payment.md
    ├── 05_insurance_partners.md
    ├── 06_visit_prereq.md
    ├── 07_cancellation_policy.md
    ├── 08_privacy_recording.md
    ├── 09_emergency_redirect.md
    ├── 10_specialties_overview.md
    ├── 11_specialty_cardiology.md
    ├── 12_specialty_ent.md
    ├── 13_specialty_internal_medicine.md
    ├── 14_specialty_ophthalmology.md
    ├── 15_specialty_pediatrics.md
    ├── 16_specialty_dentistry.md
    └── 17_specialty_dermatology.md
```

## Frontmatter schema (every article)

```yaml
---
title: <Arabic title>
category: <one of the categories from the briefing>
tags: [tag1, tag2, ...]
use_cases: [1, 2, ...]   # which UC-D1..UC-D4 this article supports
language: ar
last_reviewed: 2026-06-03
review_required: true   # always true until Jordan MoH / hospital legal signs off
---
```

## Body structure (every article — 3 sections, in this exact order)

1. **ملخص قصير** (2–3 sentences) — what this is about, in plain Arabic.
2. **التفاصيل** — bullet points with concrete details: conditions,
   exceptions, examples. Arabic-Indic numerals (٠–٩) in body copy;
   Western digits for phone numbers and reference identifiers.
3. **متى نحوّل إلى موظف بشري** — explicit handover trigger conditions,
   written so the LLM understands when to escalate. ALWAYS include this
   section even if the answer is "rarely needed — only if X".

## Length targets

- **Generic articles (01–10):** 250–400 Arabic words each.
- **Specialty mini-articles (11–17):** 120–180 Arabic words each — just
  enough to answer "what does this clinic do and when should I visit"
  without overlapping the agent's triage logic.

## What NOT to do in the articles

- No medical advice. No symptom interpretation. No drug-interaction
  guidance. No dosage. No "this might be X disease" speculation.
- No prices in money. Describe payment channels, not numbers.
- No specific physician names or schedules.
- No legal claims that haven't been vetted. Prefer phrases like
  "بموجب الأنظمة المعمول بها في المملكة الأردنية الهاشمية" or
  "حسب تعليمات وزارة الصحة الأردنية".
- No promises of specific waiting times. Use ranges or "حسب الازدحام".
- No references to KSA, UAE, NPHIES, Malaffi, Riayati, Cerner, Epic, or
  any multi-facility branch logic. Dawood is a single hospital in Jordan.
- No references to lab/imaging results delivery, refills, pre-authorization
  flow, after-hours nurse triage, or home visits — these are out of scope
  for this simplified pack.

## What TO do

- Use the **glossary** from `01_master_briefing.md` Section D for every
  domain term (مريض، زيارة، الشكوى الرئيسية، عيادة، إلخ).
- Mention that specific Dawood facility details (today's hours, current
  insurance acceptance status, etc.) come from a live lookup; the article
  gives general context.
- Cross-reference other articles where it adds clarity, e.g. "تفاصيل
  العيادات في المادة رقم ١٠".
- Use bullet symbols `-` consistently (the markdown viewer renders them
  cleanly in RTL).
- For the specialty mini-articles (11–17), every article MUST cross-link
  back to `10_specialties_overview.md`.

## Exemplar article — `10_specialties_overview.md` (write this one in full, exactly)

This is the NEW anchor article that ties the whole specialty-triage flow
together. Write it verbatim as shown:

```markdown
---
title: نظرة عامة على عيادات مستشفى داوود
category: specialties_overview
tags: [specialties, clinics, overview, triage]
use_cases: [1, 2, 4]
language: ar
last_reviewed: 2026-06-03
review_required: true
---

# نظرة عامة على عيادات مستشفى داوود

## ملخص قصير

يضم مستشفى داوود سبع عيادات تخصصية تعمل تحت سقف واحد، وكل عيادة منها تستقبل
المرضى لأسباب مختلفة. هذه المادة تعرّفكم بالعيادات السبع وأكثر الأسباب
شيوعًا لزيارة كل منها، حتى يسهل عليكم اختيار العيادة المناسبة قبل الحجز.
إذا لم تكونوا متأكدين، فالمساعدة الصوتية تستطيع اقتراح العيادة بناءً على
وصف الشكوى.

## التفاصيل

- **عيادة القلب (القلبية):** للحالات المتعلقة بالقلب والأوعية الدموية —
  مثل ألم الصدر، خفقان القلب، ضغط الدم، ومتابعة أدوية القلب. تفاصيل
  إضافية في المادة رقم ١١.

- **عيادة الأنف والأذن والحنجرة:** لمشاكل الأذن، الأنف، والحلق — مثل
  التهاب الأذن، انسداد الأنف، التهاب اللوزتين، ومشاكل السمع. تفاصيل
  إضافية في المادة رقم ١٢.

- **عيادة الباطنية:** للحالات العامة الداخلية — مثل ارتفاع ضغط الدم،
  السكري، اضطرابات الجهاز الهضمي، والإرهاق المزمن. تُستخدم أيضًا كنقطة
  بداية إذا لم تعرفوا أي عيادة تناسبكم. تفاصيل إضافية في المادة رقم ١٣.

- **عيادة العيون:** لمشاكل الإبصار — مثل ضعف النظر، احمرار العين، جفاف
  العين، فحص النظارات، ومتابعة الأمراض المزمنة كالجلوكوما. تفاصيل
  إضافية في المادة رقم ١٤.

- **عيادة الأطفال:** للأطفال من حديثي الولادة حتى سن ١٤ سنة — تشمل
  الفحص الدوري، الحرارة، السعال، اضطرابات الأكل والنوم، ومتابعة النمو.
  تفاصيل إضافية في المادة رقم ١٥.

- **عيادة الأسنان:** لصحة الفم والأسنان — مثل ألم الأسنان، تنظيف
  وتلميع، الحشوات، وأمراض اللثة. تفاصيل إضافية في المادة رقم ١٦.

- **عيادة الجلدية:** لمشاكل الجلد والشعر والأظافر — مثل الطفح الجلدي،
  حب الشباب، الإكزيما، تساقط الشعر، وفحص الشامات. تفاصيل إضافية في
  المادة رقم ١٧.

- الحجز متاح عبر المساعدة الصوتية لمستشفى داوود أو عبر استقبال المستشفى
  مباشرةً. لا حاجة لتحويلة طبية بين العيادات داخل المستشفى ذاته.

- إذا لم تعرفوا أي عيادة تناسبكم، يمكن لمساعدتنا الصوتية اقتراح العيادة
  بناءً على وصف الشكوى.

## متى نحوّل إلى موظف بشري

- إذا كانت الحالة تجمع بين أكثر من تخصص (مثلاً: طفل يعاني من طفح جلدي
  مع التهاب أذن) وتحتاج إلى تنسيق بين عيادتين في نفس اليوم.
- إذا كان المتصل يسأل عن خدمات أو عيادات غير موجودة في مستشفى داوود
  (مثل النساء والولادة، العظام، الجراحة العامة) لتوجيهه إلى الجهة
  المناسبة خارج المستشفى.
- إذا أصرّ المتصل على عيادة معينة بينما يصف أعراضًا واضحة لتخصص آخر —
  يقوم الموظف البشري بمراجعة الحالة قبل تثبيت الحجز.
```

## Directive for the remaining 16 articles

For each of `01_visiting_hours.md` through `09_emergency_redirect.md`,
then `11_specialty_cardiology.md` through `17_specialty_dermatology.md`:

1. Use the title, category, and tags from the **Knowledge Base content
   map** in `01_master_briefing.md` Section H.
2. Follow the exemplar's structure exactly: frontmatter → H1 → ملخص قصير
   → التفاصيل → متى نحوّل إلى موظف بشري.
3. Keep the writing in the same register as the exemplar: formal "أنتم",
   warm, concrete, no medical advice.
4. Cross-reference at least one other article in 6 of the 17 articles
   (not all — looks repetitive). The specialty mini-articles already
   cross-reference `10_specialties_overview.md` and that counts.
5. Every article gets `last_reviewed: 2026-06-03` and
   `review_required: true`.

### Topic-specific guidance for the generic articles (01–09)

- **01_visiting_hours.md** — default pattern only: outpatient clinics
  السبت–الخميس صباحًا ومساءً، الجمعة مغلق، الأعياد مغلقة عدا الطوارئ
  (Dawood has emergency? state that emergency redirect goes to national
  emergency — see article 09). In Ramadan, hours shift. Note that specific
  per-day hours come from a live lookup at runtime — this article is
  the general pattern.
- **02_location_parking.md** — Dawood Hospital is a single facility in
  Jordan. Do NOT invent a specific street address — say "العنوان الكامل
  وتوجيهات الوصول تُرسل عند تأكيد الحجز" and describe the *type* of access
  (مدخل المستشفى الرئيسي، مواقف مجانية للمرضى، إمكانية الوصول للكراسي
  المتحركة).
- **03_what_to_bring.md** — الهوية الوطنية أو جواز السفر، بطاقة التأمين
  إن وجدت، قائمة الأدوية الحالية، التقارير الطبية السابقة إن وجدت،
  وللأطفال: دفتر التطعيمات. Cross-reference `05_insurance_partners.md`.
- **04_payment.md** — describe channels (نقدًا في الاستقبال، بطاقات
  الائتمان والخصم، الفوترة المباشرة لشركات التأمين المعتمدة) — NO prices.
- **05_insurance_partners.md** — list real Jordanian payers as placeholders
  (Jordan Insurance, MetLife Jordan, Arab Orient, MedNet Jordan, Globemed
  Jordan). Note that real-time eligibility is checked at the reception
  desk on the day of the visit and that this list is indicative; the
  authoritative current list is at the reception. Add an inline comment
  `<!-- REVIEW WITH LEGAL: confirm current Dawood payer list with hospital admin -->`.
- **06_visit_prereq.md** — for new patients: phone confirmation, full
  name, DOB, optional insurance details, chief complaint. No referral
  needed for routine outpatient.
- **07_cancellation_policy.md** — cancel or reschedule at least ٤ ساعات
  قبل الموعد عبر المساعدة الصوتية أو الاتصال بالاستقبال. متكرر التغيب
  بدون إشعار قد يستدعي تأكيدًا مسبقًا في الحجوزات اللاحقة. Cross-reference
  the agent's voice flow ("يمكن إعادة الجدولة عبر مساعدتنا الصوتية").
- **08_privacy_recording.md** — calls are recorded with consent for
  quality and care purposes; retention windows are per Jordan MoH
  regulations; callers can request data deletion via the standard
  procedure (refer to reception). Include the inline comment
  `<!-- REVIEW WITH LEGAL: confirm retention windows per Jordan MoH -->`.
- **09_emergency_redirect.md** — IMPORTANT: any emergency (chest pain
  with shortness of breath, severe bleeding, loss of consciousness,
  severe burns, suspected stroke) redirects to Jordan's emergency
  number **911**. The voicebot is NOT for emergencies. Dawood Hospital
  outpatient clinics are not an emergency room — state this clearly.

### Topic-specific guidance for the specialty mini-articles (11–17)

Each mini-article is ~150 words and follows this micro-template:

1. **ملخص قصير (2 sentences):** what this clinic treats, who it's for.
2. **التفاصيل (3–5 bullets):** common reasons to visit, in plain Arabic.
   No medical advice — just descriptive symptom names a layperson would
   recognise (e.g. "ألم في الصدر" not "angina pectoris").
3. **متى نحوّل إلى موظف بشري (2–3 bullets):** when the bot should route
   to a human — usually:
   - Complex cases that span multiple specialties.
   - Urgent symptoms (especially in pediatrics) where the caller is
     describing distress and needs same-day evaluation.
   - Anything requiring a physical examination to decide which specialty
     applies.
4. Every mini-article ends with: "للحجز، يمكنكم استخدام المساعدة الصوتية
   لمستشفى داوود أو الاتصال باستقبال المستشفى مباشرةً. لنظرة عامة على
   جميع العيادات، انظر المادة رقم ١٠."

NO specific physician names. NO medication advice. NO disease diagnosis.

Per-clinic content hints (typical reasons to visit — keep them generic
and layperson-friendly):

- **11_specialty_cardiology** — ألم الصدر، خفقان، ضيق التنفس عند المجهود،
  ضغط الدم المرتفع، متابعة أدوية القلب.
- **12_specialty_ent** — التهاب الأذن، انسداد الأنف المزمن، التهاب
  الحلق المتكرر، مشاكل السمع، الدوار.
- **13_specialty_internal_medicine** — ارتفاع ضغط الدم، السكري، اضطرابات
  الجهاز الهضمي، الإرهاق المزمن، فحص دوري عام.
- **14_specialty_ophthalmology** — ضعف النظر، احمرار العين، جفاف العين،
  فحص النظارات، متابعة الجلوكوما.
- **15_specialty_pediatrics** — الفحص الدوري للأطفال، الحرارة، السعال،
  مشاكل النوم والتغذية، متابعة النمو. (Stress: any pediatric urgent
  symptom — convulsion, severe shortness of breath, dehydration —
  triggers handover or 911 redirect.)
- **16_specialty_dentistry** — ألم الأسنان، تنظيف وتلميع، حشوات، أمراض
  اللثة، استشارة تقويم بسيط.
- **17_specialty_dermatology** — طفح جلدي، حب الشباب، الإكزيما، تساقط
  الشعر، فحص الشامات.

## KB README — `elevenlabs/kb/README.md`

A short README that mirrors the structure of the Belron / hospitals/ KB
README. Sections:

1. **What this folder contains** — 17 Arabic markdown articles + this
   README. Articles 01–10 cover generic hospital info; articles 11–17
   are one-per-specialty mini-articles tied to Dawood's 7 clinics.
2. **Upload steps to ElevenLabs** — semantic chunk 512, overlap 64,
   top-K 3, threshold 0.30, language `ar`. Upload via the script that
   step 09 produces (`scripts/deploy_elevenlabs.mjs`), not by hand.
3. **Categories list** — pull from the briefing Section H (10 generic
   categories + 7 specialty categories).
4. **Body structure description** — restate the 3 mandatory sections:
   ملخص قصير → التفاصيل → متى نحوّل إلى موظف بشري.
5. **Test queries in Arabic** — table with this exact set:

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

6. **Versioning note** — "Re-upload changed files to ElevenLabs after
   every edit; the git copy is source of truth for review."
7. **Compliance caveat** — "Not legally vetted. Review with Jordan MoH
   guidelines and Dawood Hospital administration before customer-facing
   launch."

## Execution discipline

- **Write one article at a time**, in numeric order: 01 → 02 → 03 → … →
  17 → README. After each, print a one-line checkpoint:
  `✓ 03_what_to_bring.md — 312 words`. This keeps output observable and
  avoids mid-file truncation. The READER will check word counts in the
  verification block.
- If you hit a content question (e.g. "is `MedNet Jordan` a real payer?"),
  PROCEED with a reasonable Arabic placeholder and flag it in the final
  report; don't stop and ask. Add a `<!-- REVIEW WITH LEGAL: ... -->`
  comment inline where appropriate.
- Do NOT translate the exemplar (`10_specialties_overview.md`) into any
  other language. Write it in Arabic exactly as shown.
- Do NOT touch `elevenlabs/system_prompt.md` or `elevenlabs/tool_schemas.json`
  (those are step 05).
- Do NOT install any npm packages in this step. Only files under
  `elevenlabs/kb/` are created or modified.
- Do NOT include emojis in the article bodies — frontmatter and markdown
  only.

## Report back

When done, print:

1. The 17 filenames with their final word counts (one per line).
2. The category distribution (how many articles per category).
3. Any topic where you used a Jordan-specific placeholder you weren't
   sure about (payer names, emergency number, Ramadan hours pattern) —
   give your best guess inline and raise the flag.
4. Confirm the KB README was written and that its test-queries table has
   ≥6 rows.
5. Confirm every specialty mini-article (11–17) cross-references
   `10_specialties_overview.md` ("المادة رقم ١٠").

## Verification (the human will run)

```bash
# Count: expect 17 articles + 1 README = 18 files
ls elevenlabs/kb/*.md | wc -l

# Frontmatter visible on the first article
head -10 elevenlabs/kb/01_visiting_hours.md

# Every numbered article must contain all 3 mandatory section headings
grep -L "ملخص قصير" elevenlabs/kb/[0-9]*.md                      # expect EMPTY
grep -L "التفاصيل" elevenlabs/kb/[0-9]*.md                        # expect EMPTY
grep -L "متى نحوّل إلى موظف بشري" elevenlabs/kb/[0-9]*.md         # expect EMPTY

# Frontmatter parses (each article starts with --- and has a title:)
for f in elevenlabs/kb/[0-9]*.md; do
  head -1 "$f" | grep -q '^---$' || echo "MISSING FRONTMATTER: $f"
  grep -q '^title:' "$f" || echo "MISSING TITLE: $f"
done

# Specialty mini-articles must cross-reference article 10
for f in elevenlabs/kb/1[1-7]_*.md; do
  grep -q "المادة رقم ١٠" "$f" || echo "MISSING XREF TO 10: $f"
done

# Sanity: no leaked KSA/UAE references from the larger hospitals/ pack
grep -l -E "NPHIES|Malaffi|Riayati|998|الإمارات|السعودية|Cerner|Epic" elevenlabs/kb/*.md
# expect: no output (no files matched)
```

## STOP

Stop here. Wait for me to paste `05_elevenlabs_agent.md`.
