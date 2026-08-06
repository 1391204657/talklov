-- Affiliate / KOL ops (run in Supabase SQL Editor after migrate_affiliates.sql)

-- Create a KOL (default: first purchase 20%, renew 10%)
-- Link: https://talklov.com/?ref=maya
-- select public.upsert_affiliate(
--   'maya',
--   'Maya KOL',
--   'maya@example.com',
--   null,   -- optional: link to their profiles.id
--   2000,   -- first_bps = 20%
--   1000,   -- renew_bps = 10%
--   'US Instagram'
-- );

-- Big V (higher first rate)
-- select public.upsert_affiliate('bigv', 'Big V', 'pay@bigv.com', null, 3000, 1500, 'tier-a');

-- List affiliates
-- select code, display_name, first_bps, renew_bps, active, contact_email
-- from public.affiliates
-- order by created_at;

-- Pending commissions (for monthly payout)
-- select
--   a.code,
--   a.display_name,
--   a.contact_email,
--   c.kind,
--   c.product,
--   c.amount_cents,
--   c.currency,
--   c.commission_cents,
--   c.status,
--   c.created_at
-- from public.affiliate_commissions c
-- join public.affiliates a on a.id = c.affiliate_id
-- where c.status = 'pending'
-- order by a.code, c.created_at;

-- Mark a batch paid after you wire the money
-- update public.affiliate_commissions
--    set status = 'paid', paid_at = now()
--  where affiliate_id = (select id from public.affiliates where code = 'maya')
--    and status in ('pending', 'payable');

-- Deactivate a code
-- update public.affiliates set active = false, updated_at = now() where code = 'maya';
