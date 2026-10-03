create table public.hackathon_registrations (
  id uuid primary key default gen_random_uuid(),
  team_lead_name text not null,
  team_name text not null,
  phone text not null,
  email text not null,
  team_size smallint not null,
  member_2 text,
  member_3 text,
  member_4 text,
  created_at timestamptz not null default now(),

  constraint hackathon_registrations_team_size_check
    check (team_size between 1 and 4),
  constraint hackathon_registrations_team_lead_name_check
    check (length(btrim(team_lead_name)) between 1 and 120),
  constraint hackathon_registrations_team_name_check
    check (length(btrim(team_name)) between 1 and 120),
  constraint hackathon_registrations_phone_check
    check (phone ~ '^[+0-9() .-]{7,25}$' and phone ~ '[0-9]'),
  constraint hackathon_registrations_email_check
    check (
      length(btrim(email)) between 3 and 254
      and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
  constraint hackathon_registrations_member_2_check
    check (
      (team_size >= 2) = (nullif(btrim(member_2), '') is not null)
      and (member_2 is null or length(btrim(member_2)) between 1 and 120)
    ),
  constraint hackathon_registrations_member_3_check
    check (
      (team_size >= 3) = (nullif(btrim(member_3), '') is not null)
      and (member_3 is null or length(btrim(member_3)) between 1 and 120)
    ),
  constraint hackathon_registrations_member_4_check
    check (
      (team_size >= 4) = (nullif(btrim(member_4), '') is not null)
      and (member_4 is null or length(btrim(member_4)) between 1 and 120)
    )
);

alter table public.hackathon_registrations enable row level security;

revoke all on table public.hackathon_registrations from public, anon, authenticated;
grant insert on table public.hackathon_registrations to anon;

create policy "Public can submit hackathon registrations"
on public.hackathon_registrations
for insert
to anon
with check (true);
