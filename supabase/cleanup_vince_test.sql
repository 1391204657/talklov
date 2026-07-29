-- Cleanup TalkLov test accounts named Vince (run in Supabase SQL Editor)
-- Also remove matching auth users if you want a clean re-register.

delete from public.profiles
where lower(trim(name)) in ('vince', 'vince test')
   or lower(name) like 'vince %';

-- Optional: delete auth users that no longer have a profile (careful on prod)
-- delete from auth.users u
-- where not exists (select 1 from public.profiles p where p.id = u.id)
--   and u.created_at > now() - interval '14 days';
