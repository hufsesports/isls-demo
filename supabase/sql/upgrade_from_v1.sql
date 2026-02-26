-- 기존 init.sql(v1)을 이미 실행한 프로젝트에서, v2 스키마(Alumni Directory + coach claim policy)로 업그레이드할 때 사용

-- 1) alumni_directory 추가
create table if not exists public.alumni_directory (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cohort_code text not null,
  organization text,
  region text,
  headline text,
  expertise_tags text[],
  created_at timestamptz not null default now()
);

alter table public.alumni_directory enable row level security;

drop policy if exists "alumni_directory_select_authenticated" on public.alumni_directory;
create policy "alumni_directory_select_authenticated"
  on public.alumni_directory for select
  using (auth.role() = 'authenticated');

drop policy if exists "alumni_directory_write_admin" on public.alumni_directory;
create policy "alumni_directory_write_admin"
  on public.alumni_directory for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- 2) profiles: coach가 동일 코호트 조회 가능
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.current_role() = 'admin'
    or (
      public.current_role() = 'coach'
      and cohort_code = (select cohort_code from public.profiles where id = auth.uid())
    )
  );

-- 3) outputs claim policy (coach)
drop policy if exists "outputs_claim_coach" on public.outputs;
create policy "outputs_claim_coach"
  on public.outputs for update
  using (
    public.current_role() = 'coach'
    and reviewer_id is null
    and cohort_code = (select cohort_code from public.profiles where id = auth.uid())
  )
  with check (
    public.current_role() = 'coach'
    and reviewer_id = auth.uid()
    and cohort_code = (select cohort_code from public.profiles where id = auth.uid())
  );

-- 4) alumni_links: target_alumni_id를 directory id로 쓰고 싶다면(선택)
-- v1에서는 target_alumni_id가 profiles FK였습니다.
-- 이미 데이터가 있고, 변경이 필요하면 아래를 참고해 수동 마이그레이션하세요.
-- alter table public.alumni_links drop constraint if exists alumni_links_target_alumni_id_fkey;
