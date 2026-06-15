-- =====================================================================
-- 0007_multilingual_triage.sql — Dawood Hospital voicebot
-- Make specialty triage MULTILINGUAL. The agent's primary language is now
-- English (with Arabic + German on request), but suggest_specialty_score()
-- only scored chief_complaint_patterns.pattern_ar via pg_trgm, so any English
-- or German complaint returned ZERO suggestions. This:
--   1) adds a German pattern column (pattern_en already existed + populated),
--   2) rescoring the RPC across ar + en + de (greatest similarity).
-- =====================================================================

-- ---- 1. German pattern column + translations ------------------------
alter table public.chief_complaint_patterns
  add column if not exists pattern_de text;

update public.chief_complaint_patterns p set pattern_de = v.de
from (values
  ('b5a5cad3-d458-4c84-9c28-b7a73e707001'::uuid, 'Brustschmerzen'),
  ('43b19ba0-f9b3-4cc5-8b6a-d2270ec50b4f'::uuid, 'Beinschwellung'),
  ('797ffbb2-a5fb-4651-94e4-f4686a6f8501'::uuid, 'Atemnot'),
  ('aa01a01b-4e81-41f5-9b93-a3ab2925e3bc'::uuid, 'Bluthochdruck'),
  ('3b93cebd-55d8-492f-a8c3-74952f148fa6'::uuid, 'Herzklopfen'),
  ('cf5190ff-c436-4489-80bc-811f8f7eeac8'::uuid, 'Taubheitsgefühl in den Gliedmaßen'),
  ('5542ed69-add5-47aa-b422-3486f9e827a6'::uuid, 'Zahnschmerzen'),
  ('77bbdd23-9fe4-48fd-993c-09f5b6dd62b6'::uuid, 'Zahnreinigung'),
  ('fc4700ac-6731-4e15-808f-949c0084b953'::uuid, 'Zahnersatz'),
  ('64f8b004-d082-463d-8851-e7009b6111fe'::uuid, 'Karies'),
  ('82b5390f-7d1c-4f7e-aa0a-8c9a4ad08473'::uuid, 'Zahnfleischbluten'),
  ('b3a7de75-8e10-4064-95d2-27d2ac7a4de1'::uuid, 'Routine-Zahnkontrolle'),
  ('2bd827a0-4c39-4a37-a42b-a76281f62f1d'::uuid, 'Hautausschlag'),
  ('2dcac1a7-e3b6-4eb7-8b27-194022c2393a'::uuid, 'Juckende Haut'),
  ('1ae56d49-f7ce-441d-9646-f7aae4f3a8af'::uuid, 'Hautverfärbung'),
  ('d0e4d373-e357-4d25-9eec-bc256bcaf5c5'::uuid, 'Akne'),
  ('ab880ba7-6744-4975-b465-3128b7d58973'::uuid, 'Ekzem'),
  ('8c104cac-d1a6-4f25-9fa9-63dae6d8331d'::uuid, 'Haarausfall'),
  ('0e53ac77-df52-4349-99df-2bcf790bb2ea'::uuid, 'Tinnitus Ohrgeräusche'),
  ('107df9d3-7390-412d-97a2-749510af1509'::uuid, 'Ohrenschmerzen'),
  ('77d8a049-cb87-4379-9647-683630bf2d8c'::uuid, 'Geruchsverlust'),
  ('8c9ac6ad-4b87-4d2d-8c3b-422247493fb7'::uuid, 'Heiserkeit'),
  ('99565e72-062a-4d33-84a7-2f3560ef89da'::uuid, 'Halsschmerzen'),
  ('b669ab33-e324-423c-a231-f5361ee62997'::uuid, 'Verstopfte Nase'),
  ('a6b91b19-6c51-441a-a54a-ffcda798bcd2'::uuid, 'Bauchschmerzen'),
  ('80db059e-a4bd-4a7b-ae57-93541951f03d'::uuid, 'Taubheitsgefühl in den Gliedmaßen'),
  ('14341e17-a1e5-47f8-b8d9-0b51051f3c39'::uuid, 'Fieber'),
  ('ce148a32-f386-4703-9a13-001891caf5bb'::uuid, 'Allgemeine Müdigkeit'),
  ('ca9a2bac-8cc7-4ca4-a807-453b99b52833'::uuid, 'Kopfschmerzen'),
  ('89b6f489-0e4e-4428-8dbd-3cce922d450c'::uuid, 'Schwindel'),
  ('20a3d7af-7f74-4d3b-be92-51bd695ee267'::uuid, 'Übelkeit'),
  ('ddf97883-4a7a-4e5c-a681-b8c72f4712c3'::uuid, 'Durchfall'),
  ('b8760ba3-2f1f-4357-abde-382f5c3cd2e3'::uuid, 'Atemnot'),
  ('1af2e4b4-4354-4a23-8930-2abe14a31476'::uuid, 'Verminderte Sehkraft'),
  ('a2ff078f-b519-4082-b9b0-e9487744c5df'::uuid, 'Augenrötung'),
  ('3358c2a8-2405-4a7f-b448-55a58dbe4ed0'::uuid, 'Augenschmerzen'),
  ('0710c0f9-0c5d-4799-9ba1-f6795f609e67'::uuid, 'Juckendes Auge'),
  ('7ab02044-18bc-49fe-b2e6-be9c76856980'::uuid, 'Augenausfluss'),
  ('2451bafb-c1ac-4c14-8a79-6afd0ca313f8'::uuid, 'Routine-Augenuntersuchung'),
  ('b0d03cdd-3b86-482c-b61a-cc1d5838e2cb'::uuid, 'Husten bei einem Kind'),
  ('5c38287c-5b5a-4296-a821-e671df960118'::uuid, 'Kinderimpfungen'),
  ('edf1dc61-1480-45f7-b53d-127f69b3b96e'::uuid, 'Durchfall bei einem Kind'),
  ('093b93bb-3bf0-4b9e-9ca5-60280ce29cd1'::uuid, 'Fieber bei einem Kind'),
  ('e61ffa89-fd1d-4fea-a8a4-3e15304ef107'::uuid, 'Wachstumskontrolle beim Kind'),
  ('176f0772-9eea-4133-84d3-f54c761b46ac'::uuid, 'Ausschlag bei einem Kind')
) as v(id, de)
where p.id = v.id;

-- ---- 2. trilingual scoring RPC --------------------------------------
create or replace function public.suggest_specialty_score(complaint text)
returns table (specialty_id uuid, name_ar text, name_en text, code text, color_hex text, score real)
language sql
stable
as $$
  select s.id, s.name_ar, s.name_en, s.code, s.color_hex,
         (greatest(
            similarity(p.pattern_ar, complaint),
            similarity(coalesce(p.pattern_en, ''), complaint),
            similarity(coalesce(p.pattern_de, ''), complaint),
            0) * p.weight)::real as score
    from public.chief_complaint_patterns p
    join public.specialties s on s.id = p.specialty_id
   where p.pattern_ar % complaint
      or coalesce(p.pattern_en, '') % complaint
      or coalesce(p.pattern_de, '') % complaint
      or similarity(p.pattern_ar, complaint) > 0.15
      or similarity(coalesce(p.pattern_en, ''), complaint) > 0.15
      or similarity(coalesce(p.pattern_de, ''), complaint) > 0.15
   order by score desc
   limit 5;
$$;

revoke execute on function public.suggest_specialty_score(text) from anon;
grant execute on function public.suggest_specialty_score(text) to service_role;
