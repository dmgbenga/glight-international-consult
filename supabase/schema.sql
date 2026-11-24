create extension if not exists pgcrypto;

create table if not exists public.student_registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  student_name text not null,
  age integer not null check (age between 4 and 18),
  class_name text not null,
  programme text not null check (programme in (
    'Coding and Programming',
    'Robotics and Automation',
    'STEM Education',
    'Scratch Programming',
    'MIT App Inventor',
    'Arduino and Electronics',
    'Python Programming',
    'HTML, CSS and JavaScript',
    'Web and App Development',
    'Digital Skills and Productivity Training',
    'AI and Technology Workshops'
  )),
  learning_mode text not null check (learning_mode in ('physical', 'online')),
  guardian_consent boolean not null check (guardian_consent = true),
  guardian_consent_name text not null,
  guardian_consent_version text not null,
  guardian_consent_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'registered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_registrations_created_at_idx
  on public.student_registrations (created_at desc);
create index if not exists student_registrations_status_created_at_idx
  on public.student_registrations (status, created_at desc);

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
