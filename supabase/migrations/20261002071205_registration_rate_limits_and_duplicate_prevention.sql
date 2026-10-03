create unique index if not exists hackathon_registrations_lead_email_unique
  on public.hackathon_registrations (lower(email));
