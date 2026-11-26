create extension if not exists pgcrypto;

create table if not exists public.student_registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  student_name text not null,
  student_age integer not null,
  student_class text not null,
  additional_information text not null default '',
  programme text not null,
  learning_mode text not null,
  parental_consent boolean not null,
  guardian_consent_name text not null,
  guardian_consent_version text not null,
  guardian_consent_at timestamptz not null default now(),
  application_status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'age'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'student_age'
  ) then
    alter table public.student_registrations rename column age to student_age;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'class_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'student_class'
  ) then
    alter table public.student_registrations rename column class_name to student_class;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'guardian_consent'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'parental_consent'
  ) then
    alter table public.student_registrations rename column guardian_consent to parental_consent;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'status'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'application_status'
  ) then
    alter table public.student_registrations rename column status to application_status;
  end if;
end
$$;

alter table public.student_registrations
  add column if not exists additional_information text not null default '';
update public.student_registrations set additional_information = '' where additional_information is null;
alter table public.student_registrations
  alter column additional_information set default '',
  alter column additional_information set not null;

alter table public.student_registrations
  drop constraint if exists student_registrations_age_check;
alter table public.student_registrations
  drop constraint if exists student_registrations_student_age_check;
alter table public.student_registrations
  add constraint student_registrations_student_age_check check (student_age between 3 and 18);

alter table public.student_registrations
  drop constraint if exists student_registrations_guardian_consent_check;
alter table public.student_registrations
  drop constraint if exists student_registrations_parental_consent_check;
alter table public.student_registrations
  add constraint student_registrations_parental_consent_check check (parental_consent = true);

alter table public.student_registrations
  drop constraint if exists student_registrations_programme_check;
alter table public.student_registrations
  add constraint student_registrations_programme_check check (programme in (
    'Coding and Programming',
    'Robotics and Automation',
    'Scratch Programming',
    'MIT App Inventor',
    'Arduino and Electronics',
    'Python Programming',
    'HTML, CSS and JavaScript',
    'Web and App Development',
    'Digital Skills and Productivity Training',
    'AI and Technology Workshops',
    'STEM Education'
  )) not valid;

alter table public.student_registrations
  drop constraint if exists student_registrations_learning_mode_check;
update public.student_registrations
set learning_mode = case lower(learning_mode)
  when 'physical' then 'Physical'
  when 'online' then 'Online'
  else learning_mode
end;
alter table public.student_registrations
  add constraint student_registrations_learning_mode_check check (learning_mode in ('Physical', 'Online'));

alter table public.student_registrations
  drop constraint if exists student_registrations_status_check;
alter table public.student_registrations
  drop constraint if exists student_registrations_application_status_check;
alter table public.student_registrations
  alter column application_status drop default;
update public.student_registrations
set application_status = case lower(application_status)
  when 'pending' then 'Pending'
  when 'contacted' then 'Contacted'
  when 'approved' then 'Approved'
  when 'rejected' then 'Rejected'
  when 'registered' then 'Registered'
  when 'closed' then 'Closed'
  else application_status
end;
alter table public.student_registrations
  alter column application_status set default 'Pending';
alter table public.student_registrations
  add constraint student_registrations_application_status_check
  check (application_status in ('Pending', 'Contacted', 'Approved', 'Rejected')) not valid;

create index if not exists student_registrations_created_at_idx
  on public.student_registrations (created_at desc);
drop index if exists public.student_registrations_status_created_at_idx;
create index if not exists student_registrations_application_status_created_at_idx
  on public.student_registrations (application_status, created_at desc);
create index if not exists student_registrations_programme_idx
  on public.student_registrations (programme);
create index if not exists student_registrations_learning_mode_idx
  on public.student_registrations (learning_mode);

alter table public.student_registrations enable row level security;
revoke all on table public.student_registrations from anon, authenticated;
grant all on table public.student_registrations to service_role;

create table if not exists public.registration_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create index if not exists registration_rate_limits_window_started_at_idx
  on public.registration_rate_limits (window_started_at);

alter table public.registration_rate_limits enable row level security;
revoke all on table public.registration_rate_limits from anon, authenticated;
grant all on table public.registration_rate_limits to service_role;

create or replace function public.consume_registration_limit(
  p_key_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_window timestamptz := clock_timestamp();
  current_count integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' or p_limit < 1 or p_limit > 20 or
     p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit arguments' using errcode = '22023';
  end if;

  delete from public.registration_rate_limits
  where window_started_at < current_window - make_interval(secs => p_window_seconds * 2);

  insert into public.registration_rate_limits (key_hash, window_started_at, request_count)
  values (p_key_hash, current_window, 1)
  on conflict (key_hash) do update
  set window_started_at = case
        when registration_rate_limits.window_started_at <=
          current_window - make_interval(secs => p_window_seconds)
        then current_window
        else registration_rate_limits.window_started_at
      end,
      request_count = case
        when registration_rate_limits.window_started_at <=
          current_window - make_interval(secs => p_window_seconds)
        then 1
        else registration_rate_limits.request_count + 1
      end
  returning request_count into current_count;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_registration_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_registration_limit(text, integer, integer) to service_role;
