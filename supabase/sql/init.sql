-- ISLS SaaS (MVP) Supabase 초기 스키마
-- 실행 위치: Supabase SQL Editor

-- 0) 확장
create extension if not exists "pgcrypto";

-- 1) profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'learner' check (role in ('learner','coach','admin')),
  full_name text,
  cohort_code text,
  created_at timestamptz not null default now()
);

-- 신규 유저 생성 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'learner')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) modules
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  cohort_code text not null,
  title text not null,
  description text,
  content_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 3) enrollments
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  progress numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, module_id)
);

-- 4) outputs
create table if not exists public.outputs (
  id uuid primary key default gen_random_uuid(),
  cohort_code text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_id uuid references public.modules (id) on delete set null,
  title text not null,
  content text,
  file_path text,
  review_status text not null default 'submitted' check (review_status in ('submitted','reviewing','approved','revision_needed')),
  reviewer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) mentoring
create table if not exists public.mentoring_slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  meeting_url text,
  capacity int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.mentoring_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.mentoring_slots (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'booked' check (status in ('booked','cancelled','completed')),
  note text,
  created_at timestamptz not null default now(),
  unique (slot_id, learner_id)
);

-- 6) alumni links
create table if not exists public.alumni_links (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  target_alumni_id uuid not null,
  reason text,
  status text not null default 'requested' check (status in ('requested','introduced','rejected','completed')),
  created_at timestamptz not null default now()
);

-- 6.5) alumni directory (public directory for authenticated users)
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

-- 7) RLS 기본 설정
alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.enrollments enable row level security;
alter table public.outputs enable row level security;
alter table public.mentoring_slots enable row level security;
alter table public.mentoring_bookings enable row level security;
alter table public.alumni_links enable row level security;
alter table public.alumni_directory enable row level security;

-- 헬퍼: 현재 유저 role
create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'learner');
$$;

-- profiles: 본인만 + (coach는 동일 코호트 조회 가능) + admin 전체
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

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid() or public.current_role() = 'admin')
  with check (id = auth.uid() or public.current_role() = 'admin');

-- modules: 같은 cohort_code만 select, admin만 write
drop policy if exists "modules_select_same_cohort" on public.modules;
create policy "modules_select_same_cohort"
  on public.modules for select
  using (
    public.current_role() = 'admin'
    or cohort_code = (select cohort_code from public.profiles where id = auth.uid())
  );

drop policy if exists "modules_write_admin" on public.modules;
create policy "modules_write_admin"
  on public.modules for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- enrollments: 본인만
drop policy if exists "enrollments_self" on public.enrollments;
create policy "enrollments_self"
  on public.enrollments for all
  using (user_id = auth.uid() or public.current_role() = 'admin')
  with check (user_id = auth.uid() or public.current_role() = 'admin');

-- outputs: learner 본인, coach/admin 코호트 범위
drop policy if exists "outputs_select" on public.outputs;
create policy "outputs_select"
  on public.outputs for select
  using (
    user_id = auth.uid()
    or public.current_role() = 'admin'
    or (
      public.current_role() = 'coach'
      and cohort_code = (select cohort_code from public.profiles where id = auth.uid())
    )
  );

drop policy if exists "outputs_insert_self" on public.outputs;
create policy "outputs_insert_self"
  on public.outputs for insert
  with check (user_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "outputs_update_self_or_reviewer_or_admin" on public.outputs;
create policy "outputs_update_self_or_reviewer_or_admin"
  on public.outputs for update
  using (
    public.current_role() = 'admin'
    or user_id = auth.uid()
    or reviewer_id = auth.uid()
  )
  with check (
    public.current_role() = 'admin'
    or user_id = auth.uid()
    or reviewer_id = auth.uid()
  );

-- coach가 아직 reviewer_id가 없는 output을 "claim" 할 수 있도록
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

-- mentoring_slots: coach 본인, admin 전체
drop policy if exists "slots_select" on public.mentoring_slots;
create policy "slots_select" on public.mentoring_slots for select
  using (true);

drop policy if exists "slots_write_coach_or_admin" on public.mentoring_slots;
create policy "slots_write_coach_or_admin" on public.mentoring_slots for all
  using (
    public.current_role() = 'admin'
    or (public.current_role() = 'coach' and coach_id = auth.uid())
  )
  with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'coach' and coach_id = auth.uid())
  );

-- mentoring_bookings: learner 본인, coach는 본인 slot에 대한 booking select
drop policy if exists "bookings_select" on public.mentoring_bookings;
create policy "bookings_select" on public.mentoring_bookings for select
  using (
    public.current_role() = 'admin'
    or learner_id = auth.uid()
    or (
      public.current_role() = 'coach'
      and slot_id in (select id from public.mentoring_slots where coach_id = auth.uid())
    )
  );

drop policy if exists "bookings_write_self_or_admin" on public.mentoring_bookings;
create policy "bookings_write_self_or_admin" on public.mentoring_bookings for all
  using (learner_id = auth.uid() or public.current_role() = 'admin')
  with check (learner_id = auth.uid() or public.current_role() = 'admin');

-- alumni_links: requester 본인, admin 전체
drop policy if exists "alumni_links_self_or_admin" on public.alumni_links;
create policy "alumni_links_self_or_admin" on public.alumni_links for all
  using (requester_id = auth.uid() or public.current_role() = 'admin')
  with check (requester_id = auth.uid() or public.current_role() = 'admin');

-- alumni_directory: 로그인(Authenticated) 유저는 읽기 가능, admin만 쓰기
drop policy if exists "alumni_directory_select_authenticated" on public.alumni_directory;
create policy "alumni_directory_select_authenticated"
  on public.alumni_directory for select
  using (auth.role() = 'authenticated');

drop policy if exists "alumni_directory_write_admin" on public.alumni_directory;
create policy "alumni_directory_write_admin"
  on public.alumni_directory for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
