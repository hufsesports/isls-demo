-- ISLS SaaS (MVP) 샘플 데이터
-- 실행: Supabase SQL Editor

-- 1) 샘플 모듈 (cohort_code = '2026-A')
insert into public.modules (cohort_code, title, description, content_url, sort_order)
values
  ('2026-A', 'Module 1 · Career Narrative', 'CV / STAR / metrics', null, 1),
  ('2026-A', 'Module 2 · International Sports Governance', 'IOC/IF/NOC structure', null, 2),
  ('2026-A', 'Module 3 · Presentation', 'Pitch deck · rehearsal', null, 3)
on conflict do nothing;

-- 1.5) 샘플 Alumni 디렉토리
insert into public.alumni_directory (full_name, cohort_code, organization, region, headline, expertise_tags)
values
  ('Alex Kim', '2024-B', 'IF Secretariat', 'Europe', 'International federation operations', array['governance','event ops','policy']),
  ('Minji Park', '2025-A', 'Sports Tech Startup', 'Korea', 'Data-driven sport development', array['data','strategy','partnership']),
  ('David Lee', '2023-C', 'NOC', 'APAC', 'High-performance & elite pathway', array['HP','athlete','program'])
on conflict do nothing;

-- 1.6) 샘플 Mentoring Slot (코치 계정이 생성된 뒤에 추가하는게 가장 안전합니다)
-- 아래 예시는 coach UUID를 알아야 하므로 주석 처리되어 있습니다.
-- insert into public.mentoring_slots (coach_id, start_at, end_at, location, meeting_url, capacity)
-- values ('YOUR_COACH_UUID'::uuid, now() + interval '2 days', now() + interval '2 days' + interval '30 min', 'Zoom', 'https://meet.example.com', 1);

-- 2) (선택) 현재 로그인 유저에 enrollments를 만들고 싶다면,
-- 아래 블록에서 YOUR_USER_UUID 를 본인 auth.users id 로 바꿔서 실행하세요.
-- Table Editor → auth.users / profiles 에서 확인 가능합니다.

-- insert into public.enrollments (user_id, module_id, status, progress)
-- select
--   'YOUR_USER_UUID'::uuid as user_id,
--   m.id as module_id,
--   case when m.sort_order = 1 then 'completed' when m.sort_order = 2 then 'in_progress' else 'not_started' end as status,
--   case when m.sort_order = 1 then 100 when m.sort_order = 2 then 35 else 0 end as progress
-- from public.modules m
-- where m.cohort_code = '2026-A'
-- on conflict (user_id, module_id) do update
-- set status = excluded.status, progress = excluded.progress, updated_at = now();
