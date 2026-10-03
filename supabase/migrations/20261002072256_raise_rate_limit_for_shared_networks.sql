create or replace function public.take_registration_rate_limit(p_ip_hash text)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_row public.registration_rate_limits%rowtype;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    return query select false, 3600;
    return;
  end if;

  insert into public.registration_rate_limits as limits
    (ip_hash, window_started_at, attempt_count, last_seen_at)
  values (p_ip_hash, v_now, 1, v_now)
  on conflict (ip_hash) do update
    set window_started_at = case
          when limits.window_started_at <= v_now - interval '1 hour' then v_now
          else limits.window_started_at
        end,
        attempt_count = case
          when limits.window_started_at <= v_now - interval '1 hour' then 1
          else limits.attempt_count + 1
        end,
        last_seen_at = v_now
  returning * into v_row;

  delete from public.registration_rate_limits
    where last_seen_at < v_now - interval '48 hours';

  return query
    select v_row.attempt_count <= 100,
      case when v_row.attempt_count <= 100 then 0
        else greatest(1, ceil(extract(epoch from
          (v_row.window_started_at + interval '1 hour' - v_now)))::integer)
      end;
end;
$$;
