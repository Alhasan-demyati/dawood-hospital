-- =====================================================================
-- seed.sql — Dawood Hospital voicebot — Jordan-flavored demo data
-- Run AFTER all 6 migrations. Anchored on now() so "today / upcoming"
-- rows stay correct whenever this is applied.
-- Idempotent-ish: natural-key inserts use ON CONFLICT DO NOTHING; the
-- generated tables (patterns, slots, visits, intake) are guarded so a
-- re-run is a no-op. For a clean re-seed, uncomment the truncate block.
-- =====================================================================

-- Uncomment to wipe data before re-seeding. DESTRUCTIVE.
-- do $$ begin
--   truncate
--     customer_feedback, outcomes, handovers, tool_calls, turns,
--     conversations, safety_events, consent_log, audit_log,
--     visit_intake, visits, patients,
--     slot_overrides, slot_templates, visit_types,
--     chief_complaint_patterns, specialties,
--     facility_holidays, facility_hours, facilities,
--     admin_users
--   restart identity cascade;
-- end $$;

begin;

-- ---------------------------------------------------------------------
-- 1) Facility (single row — Dawood Hospital)
-- ---------------------------------------------------------------------
insert into public.facilities
  (code, name_ar, name_en, address_line1, address_line2, city, country, phone, services, active)
values (
  'dawood_main',
  'مستشفى داوود',
  'Dawood Hospital',
  '<<ADDRESS LINE 1 — confirm with client>>',   -- ops: update before go-live
  '<<ADDRESS LINE 2 — confirm with client>>',   -- ops: update before go-live
  'Amman',
  'JO',
  '+96265000000',                                -- placeholder Jordanian landline
  array['cardiology','ent','internal_medicine','ophthalmology','pediatrics','dentistry','dermatology'],
  true
)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 2) Facility hours — Sun–Thu 08:00–20:00, Fri closed, Sat 10:00–18:00
--    (typical Jordanian outpatient pattern; ops should confirm)
-- ---------------------------------------------------------------------
insert into public.facility_hours (facility_id, day_of_week, opens_at, closes_at, is_closed)
select f.id, h.dow, h.o, h.c, h.closed
from public.facilities f
cross join (values
  (0, time '08:00', time '20:00', false),   -- Sunday
  (1, time '08:00', time '20:00', false),   -- Monday
  (2, time '08:00', time '20:00', false),   -- Tuesday
  (3, time '08:00', time '20:00', false),   -- Wednesday
  (4, time '08:00', time '20:00', false),   -- Thursday
  (5, null::time,   null::time,   true),    -- Friday (closed)
  (6, time '10:00', time '18:00', false)    -- Saturday
) as h(dow, o, c, closed)
where f.code = 'dawood_main'
on conflict (facility_id, day_of_week) do nothing;

-- ---------------------------------------------------------------------
-- 3) Facility holidays (2026) — Hijri Eids are APPROXIMATE and shift
--    each year. Ops must review facility_holidays annually.
-- ---------------------------------------------------------------------
insert into public.facility_holidays (facility_id, date, reason)
select f.id, d.dt, d.reason
from public.facilities f
cross join (values
  (date '2026-01-01', 'رأس السنة الميلادية / New Year''s Day'),
  (date '2026-03-20', 'عيد الفطر (يوم 1) — تقديري، يتغير سنوياً'),
  (date '2026-03-21', 'عيد الفطر (يوم 2) — تقديري'),
  (date '2026-03-22', 'عيد الفطر (يوم 3) — تقديري'),
  (date '2026-05-25', 'عيد الاستقلال / Independence Day'),
  (date '2026-05-27', 'عيد الأضحى (يوم 1) — تقديري، يتغير سنوياً'),
  (date '2026-05-28', 'عيد الأضحى (يوم 2) — تقديري'),
  (date '2026-05-29', 'عيد الأضحى (يوم 3) — تقديري'),
  (date '2026-05-30', 'عيد الأضحى (يوم 4) — تقديري'),
  (date '2026-12-25', 'عيد الميلاد المجيد / Christmas Day')
) as d(dt, reason)
where f.code = 'dawood_main'
on conflict (facility_id, date) do nothing;

-- ---------------------------------------------------------------------
-- 4) Specialties — exactly the 7 Dawood clinics
-- ---------------------------------------------------------------------
insert into public.specialties (code, name_ar, name_en, color_hex, description_ar, description_en)
values
  ('cardiology', 'عيادة القلب', 'Cardiology', '#dc2626',
   'تُعنى بأمراض القلب والشرايين وضغط الدم وتقييم آلام الصدر والخفقان.',
   'Heart and vascular care: blood pressure, chest pain, and palpitations.'),
  ('ent', 'عيادة الأنف والأذن والحنجرة', 'ENT', '#f59e0b',
   'تشخّص وتعالج مشاكل الأذن والأنف والحنجرة كالتهابات الأذن واحتقان الأنف.',
   'Ear, nose, and throat conditions: ear infections, congestion, sore throat.'),
  ('internal_medicine', 'عيادة الباطنية', 'Internal Medicine', '#0891b2',
   'الرعاية العامة للبالغين: الحرارة، الصداع، آلام البطن، والمتابعة المزمنة.',
   'General adult care: fever, headache, abdominal pain, and chronic follow-up.'),
  ('ophthalmology', 'عيادة العيون', 'Ophthalmology', '#7c3aed',
   'فحص النظر وعلاج احمرار العين والحكة وضعف الرؤية.',
   'Eye exams and treatment of redness, itching, and reduced vision.'),
  ('pediatrics', 'عيادة الأطفال', 'Pediatrics', '#ec4899',
   'رعاية الأطفال: الحرارة، الكحة، التطعيمات، ومتابعة النمو.',
   'Child care: fever, cough, vaccinations, and growth monitoring.'),
  ('dentistry', 'عيادة الأسنان', 'Dentistry', '#16a34a',
   'علاج آلام الأسنان والتسوس وتنظيف الأسنان والفحوصات الدورية.',
   'Tooth pain, cavities, cleaning, and routine dental check-ups.'),
  ('dermatology', 'عيادة الجلدية', 'Dermatology', '#0ea5e9',
   'تشخّص أمراض الجلد كالطفح والحكة وحب الشباب وتساقط الشعر.',
   'Skin conditions: rashes, itching, acne, and hair loss.')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 5) Chief-complaint patterns (45 rows; some complaints cross-route to
--    two specialties with different weights — the suggest_specialty
--    signal). Guarded so a re-run does not duplicate.
-- ---------------------------------------------------------------------
insert into public.chief_complaint_patterns (pattern_ar, pattern_en, specialty_id, weight)
select v.pattern_ar, v.pattern_en, s.id, v.weight
from (values
  ('ألم في الصدر',        'Chest pain',                 'cardiology',        3),
  ('خفقان',               'Palpitations',               'cardiology',        2),
  ('ضغط الدم مرتفع',      'High blood pressure',        'cardiology',        2),
  ('صعوبة في التنفس',     'Shortness of breath',        'cardiology',        2),
  ('صعوبة في التنفس',     'Shortness of breath',        'internal_medicine', 1),
  ('تورم في الساقين',     'Leg swelling',               'cardiology',        2),
  ('دوار / دوخة',         'Dizziness',                  'internal_medicine', 2),
  ('صداع',                'Headache',                   'internal_medicine', 2),
  ('تعب عام',             'General fatigue',            'internal_medicine', 2),
  ('حرارة',               'Fever',                      'internal_medicine', 2),
  ('حرارة عند طفل',       'Fever in a child',           'pediatrics',        3),
  ('تنميل في الأطراف',    'Limb numbness',              'internal_medicine', 2),
  ('تنميل في الأطراف',    'Limb numbness',              'cardiology',        1),
  ('ألم في البطن',        'Abdominal pain',             'internal_medicine', 2),
  ('إسهال',               'Diarrhea',                   'internal_medicine', 2),
  ('غثيان',               'Nausea',                     'internal_medicine', 2),
  ('ألم في الأذن',        'Ear pain',                   'ent',               3),
  ('طنين في الأذن',       'Tinnitus',                   'ent',               3),
  ('احتقان في الأنف',     'Nasal congestion',           'ent',               2),
  ('التهاب في الحلق',     'Sore throat',                'ent',               2),
  ('بحة في الصوت',        'Hoarseness',                 'ent',               2),
  ('فقدان حاسة الشم',     'Loss of smell',              'ent',               2),
  ('ضعف في النظر',        'Reduced vision',             'ophthalmology',     3),
  ('احمرار في العين',     'Eye redness',                'ophthalmology',     3),
  ('حكة في العين',        'Itchy eye',                  'ophthalmology',     2),
  ('ألم في العين',        'Eye pain',                   'ophthalmology',     2),
  ('إفرازات من العين',    'Eye discharge',              'ophthalmology',     2),
  ('فحص نظر دوري',        'Routine eye exam',           'ophthalmology',     1),
  ('كحة عند طفل',         'Cough in a child',           'pediatrics',        3),
  ('إسهال عند طفل',       'Diarrhea in a child',        'pediatrics',        3),
  ('طفح جلدي عند طفل',    'Rash in a child',            'pediatrics',        2),
  ('تطعيمات للطفل',       'Child vaccinations',         'pediatrics',        3),
  ('متابعة نمو الطفل',    'Child growth follow-up',     'pediatrics',        2),
  ('ألم في الأسنان',      'Toothache',                  'dentistry',         3),
  ('تنظيف أسنان',         'Teeth cleaning',             'dentistry',         3),
  ('تسوس',                'Tooth decay',                'dentistry',         2),
  ('نزيف اللثة',          'Gum bleeding',               'dentistry',         2),
  ('تركيب أسنان',         'Dental prosthetics',         'dentistry',         2),
  ('فحص أسنان دوري',      'Routine dental check',       'dentistry',         1),
  ('طفح جلدي',            'Skin rash',                  'dermatology',       3),
  ('حكة في الجلد',        'Itchy skin',                 'dermatology',       3),
  ('حب الشباب',           'Acne',                       'dermatology',       2),
  ('إكزيما',              'Eczema',                     'dermatology',       2),
  ('تساقط الشعر',         'Hair loss',                  'dermatology',       2),
  ('تغير في لون الجلد',   'Skin discoloration',         'dermatology',       2)
) as v(pattern_ar, pattern_en, code, weight)
join public.specialties s on s.code = v.code
where not exists (select 1 from public.chief_complaint_patterns);

-- ---------------------------------------------------------------------
-- 6) Visit types (8)
-- ---------------------------------------------------------------------
insert into public.visit_types (code, name_ar, name_en, default_duration_minutes, specialty_id)
select v.code, v.name_ar, v.name_en, v.dur, s.id
from (values
  ('new_consult_general',    'استشارة عامة جديدة',   'New general consult', 30, null::text),
  ('follow_up_general',      'مراجعة عامة',          'General follow-up',   15, null::text),
  ('new_consult_pediatric',  'استشارة أطفال جديدة',  'New pediatric consult', 30, 'pediatrics'),
  ('new_consult_cardiology', 'استشارة قلب جديدة',    'New cardiology consult', 30, 'cardiology'),
  ('dental_checkup',         'فحص أسنان',            'Dental check-up',     30, 'dentistry'),
  ('eye_exam',               'فحص نظر',              'Eye exam',            20, 'ophthalmology'),
  ('dermatology_consult',    'استشارة جلدية',        'Dermatology consult', 20, 'dermatology'),
  ('ent_consult',            'استشارة أنف وأذن وحنجرة', 'ENT consult',       20, 'ent')
) as v(code, name_ar, name_en, dur, scode)
left join public.specialties s on s.code = v.scode
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 7) Slot templates (~30): 4 windows per specialty (Sun/Tue/Thu/Sat)
--    + 2 extra internal-medicine windows. Guarded against re-run.
-- ---------------------------------------------------------------------
insert into public.slot_templates (facility_id, specialty_id, day_of_week, start_time, end_time, rooms)
select f.id, s.id, d.dow, d.st, d.et, d.rooms
from public.facilities f
cross join public.specialties s
cross join (values
  (0, time '08:00', time '12:00', 1::smallint),
  (2, time '13:00', time '17:00', 1::smallint),
  (4, time '09:00', time '13:00', 1::smallint),
  (6, time '10:00', time '13:00', 1::smallint)
) as d(dow, st, et, rooms)
where f.code = 'dawood_main'
  and not exists (select 1 from public.slot_templates)
union all
select f.id, s.id, d.dow, d.st, d.et, d.rooms
from public.facilities f
cross join public.specialties s
cross join (values
  (1, time '08:00', time '12:00', 2::smallint),
  (3, time '14:00', time '18:00', 1::smallint)
) as d(dow, st, et, rooms)
where f.code = 'dawood_main'
  and s.code = 'internal_medicine'
  and not exists (select 1 from public.slot_templates);

-- ---------------------------------------------------------------------
-- 8) Patients (30): 27 adults + 3 minors linked to guardians.
--    Arabic Jordanian names; +96279/78/77 mobile prefixes; ~5 prefer EN.
-- ---------------------------------------------------------------------
insert into public.patients (mrn, first_name, last_name, dob, phone_e164, email, language, preferred_contact)
values
  ('MRN-0001','أحمد','الحسن',      date '1979-03-12','+962791000001', null,                       'ar','sms'),
  ('MRN-0002','فاطمة','النمر',     date '1986-07-25','+962781000002', null,                       'ar','whatsapp'),
  ('MRN-0003','خالد','خوري',       date '1968-11-03','+962771000003', null,                       'ar','sms'),
  ('MRN-0004','مريم','داود',       date '1990-01-18','+962792000004', null,                       'ar','whatsapp'),
  ('MRN-0005','عمر','بشير',        date '1995-09-09','+962782000005', 'omar.bashir@example.com',  'en','email'),
  ('MRN-0006','ليلى','طبّاع',      date '1972-05-30','+962772000006', null,                       'ar','sms'),
  ('MRN-0007','نور','صالح',        date '2001-12-14','+962793000007', null,                       'ar','whatsapp'),
  ('MRN-0008','يوسف','المصري',     date '1959-02-21','+962783000008', null,                       'ar','sms'),
  ('MRN-0009','رنا','عبدالله',     date '1988-08-08','+962773000009', 'rana.abdullah@example.com','en','email'),
  ('MRN-0010','بلال','عطالله',     date '1993-04-17','+962794000010', null,                       'ar','sms'),
  ('MRN-0011','سارة','حداد',       date '1997-06-02','+962784000011', null,                       'ar','whatsapp'),
  ('MRN-0012','محمد','العمري',     date '1965-10-19','+962774000012', null,                       'ar','sms'),
  ('MRN-0013','هبة','قاسم',        date '1991-03-27','+962795000013', null,                       'ar','whatsapp'),
  ('MRN-0014','سامي','الزعبي',     date '1983-07-11','+962785000014', 'sami.zoubi@example.com',   'en','email'),
  ('MRN-0015','دعاء','الخطيب',     date '1999-11-23','+962775000015', null,                       'ar','sms'),
  ('MRN-0016','طارق','المعايطة',   date '1976-09-05','+962796000016', null,                       'ar','whatsapp'),
  ('MRN-0017','ريم','النابلسي',    date '1994-02-13','+962786000017', null,                       'ar','sms'),
  ('MRN-0018','حسن','الشوبكي',     date '1961-12-29','+962776000018', null,                       'ar','sms'),
  ('MRN-0019','آية','الرواشدة',    date '2000-05-08','+962797000019', null,                       'ar','whatsapp'),
  ('MRN-0020','زيد','الفاعوري',    date '1989-08-16','+962787000020', 'zaid.faouri@example.com',  'en','email'),
  ('MRN-0021','لينا','السعدي',     date '1996-01-30','+962777000021', null,                       'ar','whatsapp'),
  ('MRN-0022','عبدالله','الطراونة',date '1957-06-22','+962798000022', null,                       'ar','sms'),
  ('MRN-0023','رغد','العزة',       date '1992-10-10','+962788000023', null,                       'ar','whatsapp'),
  ('MRN-0024','معتز','برغوثي',     date '1985-04-04','+962778000024', null,                       'ar','sms'),
  ('MRN-0025','سلمى','القضاة',     date '1998-03-19','+962799000025', 'salma.qudah@example.com',  'en','email'),
  ('MRN-0026','إياد','الحموري',    date '1970-07-07','+962789000026', null,                       'ar','sms'),
  ('MRN-0027','جنى','مهنا',        date '2002-09-28','+962779000027', null,                       'ar','whatsapp')
on conflict (mrn) do nothing;

-- Minors (phone NULL — reached via guardian)
insert into public.patients
  (mrn, first_name, last_name, dob, phone_e164, email, language, preferred_contact, is_minor, guardian_patient_id)
select c.mrn, c.fn, c.ln, c.dob, null, null, 'ar', 'sms', true, g.id
from (values
  ('MRN-0028','ريان','الحسن', date '2022-05-10','MRN-0001'),
  ('MRN-0029','ميرا','داود',  date '2021-09-15','MRN-0004'),
  ('MRN-0030','آدم','خوري',   date '2023-02-20','MRN-0003')
) as c(mrn, fn, ln, dob, guardian_mrn)
join public.patients g on g.mrn = c.guardian_mrn
on conflict (mrn) do nothing;

-- ---------------------------------------------------------------------
-- 9) Visits (60): 30 past (discharged/cancelled/no_show), 20 upcoming,
--    10 today — all 'scheduled'. Round-robin over patients + 7
--    specialties. Anchored on now(). Guarded by ON CONFLICT.
-- ---------------------------------------------------------------------
with nums as (
  select
    n,
    (n - 1) % 30 as pat_idx,
    (n - 1) % 7  as spec_idx,
    case
      when n <= 30 then date_trunc('day', now()) - make_interval(days => n * 2) + make_interval(hours => 6 + (n % 8))
      when n <= 50 then date_trunc('day', now()) + make_interval(days => n - 30) + make_interval(hours => 7 + (n % 6))
      else              date_trunc('day', now()) + make_interval(hours => 6 + (n - 51))
    end as ss,
    case
      when n <= 30 then (case (n % 5) when 3 then 'cancelled' when 4 then 'no_show' else 'discharged' end)
      else 'scheduled'
    end as st
  from generate_series(1, 60) as g(n)
)
insert into public.visits
  (booking_reference, patient_id, facility_id, specialty_id, visit_type_id,
   scheduled_start, scheduled_end, status, is_follow_up, cancellation_reason, created_at)
select
  'DV-' || upper(lpad(to_hex(700000 + nums.n), 5, '0')),
  pat.id,
  fac.id,
  sp.id,
  vt.id,
  nums.ss,
  nums.ss + interval '30 minutes',
  nums.st,
  (nums.n % 4 = 0),
  case when nums.st = 'cancelled' then 'ألغى المريض الموعد' else null end,
  now()
from nums
cross join lateral (select id from public.facilities where code = 'dawood_main' limit 1) fac
cross join lateral (select id from public.patients order by mrn offset nums.pat_idx limit 1) pat
cross join lateral (select id, code from public.specialties order by code offset nums.spec_idx limit 1) sp
left join lateral (
  -- Prefer a specialty-specific visit type; fall back to new_consult_general
  -- so every visit is typed (internal_medicine has no specialty-specific type).
  select vt.id from public.visit_types vt
  where vt.specialty_id = sp.id or vt.code = 'new_consult_general'
  order by coalesce(vt.specialty_id = sp.id, false) desc, vt.code
  limit 1
) vt on true
on conflict (booking_reference) do nothing;

-- ---------------------------------------------------------------------
-- 10) Visit intake (1:1 with visits). chief_complaint drawn from the
--     patterns table for that specialty; suggested_specialty_id set for
--     ~70%; picked_by ~50/35/15. Deterministic per booking_reference.
-- ---------------------------------------------------------------------
insert into public.visit_intake
  (visit_id, chief_complaint, symptom_duration_days, pediatric_weight_kg,
   suggested_specialty_id, picked_by, payer_name, created_at)
select
  v.id,
  coalesce(cc.pattern_ar, 'استشارة عامة'),
  (h.h % 14) + 1,
  case when sp.code = 'pediatrics' then round((8 + (h.h % 20))::numeric, 1) else null end,
  case when (h.h % 10) < 7 then v.specialty_id else null end,
  case when (h.h % 100) < 50 then 'patient'
       when (h.h % 100) < 85 then 'bot_suggestion'
       else 'staff_override' end,
  (array['التأمين الأردنية','ميتلايف','الشرق العربي للتأمين','نقابة الأطباء', null]::text[])[(h.h % 5) + 1],
  now()
from public.visits v
join public.specialties sp on sp.id = v.specialty_id
cross join lateral (select (hashtext(v.booking_reference) & 2147483647) as h) h
left join lateral (
  select p.pattern_ar
  from public.chief_complaint_patterns p
  where p.specialty_id = v.specialty_id
  order by p.weight desc, p.pattern_ar
  offset (h.h % greatest(1, (select count(*) from public.chief_complaint_patterns p2 where p2.specialty_id = v.specialty_id)))
  limit 1
) cc on true
on conflict (visit_id) do nothing;

-- ---------------------------------------------------------------------
-- 11) Admin users (2 placeholders — ops replaces with real Magic Link
--     addresses before go-live).
-- ---------------------------------------------------------------------
insert into public.admin_users (email, full_name, role, active)
values
  ('admin1@dawood-hospital.example', 'مشرف داوود الأول', 'admin', true),
  ('admin2@dawood-hospital.example', 'مشرف داوود الثاني', 'admin', true)
on conflict (email) do nothing;

commit;
