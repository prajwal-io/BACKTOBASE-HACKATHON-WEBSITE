create policy "Block direct client access to registrations"
on public.hackathon_registrations
for all
to anon, authenticated
using (false)
with check (false);

create policy "Block client access to registration rate limits"
on public.registration_rate_limits
for all
to anon, authenticated
using (false)
with check (false);
