-- =============================================================
-- TalkLov seed: 6 demo profiles for browsing / matching demos.
-- Run AFTER schema.sql in Supabase SQL Editor.
--
-- These are synthetic auth.users + profiles so Discover isn't empty
-- before real people sign up. Password for all: TalklovDemo1!
-- (You normally won't log in as them; they're scenery for the feed.)
-- =============================================================

create extension if not exists pgcrypto;

-- Helper: upsert a demo auth user + profile
create or replace function public._seed_demo_user(
  p_id uuid,
  p_email text,
  p_name text,
  p_handle text,
  p_age int,
  p_gender text,
  p_country text,
  p_city text,
  p_native text,
  p_learning text,
  p_level text,
  p_intents text[],
  p_interests text[],
  p_bio text,
  p_avatar text,
  p_variant text,
  p_privacy text,
  p_verified boolean,
  p_online boolean
) returns void language plpgsql security definer as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('TalklovDemo1!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name, 'handle', p_handle),
    now(), now(), '', '', '', ''
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    p_id, p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email', p_id::text,
    now(), now(), now()
  )
  on conflict do nothing;

  insert into public.profiles (
    id, handle, name, age, gender, country, city,
    native_lang, learning_lang, level, intents, interests, bio,
    avatar_url, chinese_variant, photo_privacy, tier, verified, online
  ) values (
    p_id, p_handle, p_name, p_age, p_gender, p_country, p_city,
    p_native, p_learning, p_level, p_intents, p_interests, p_bio,
    p_avatar, p_variant, p_privacy,
    case when p_verified then 'verified' else 'light' end,
    p_verified, p_online
  )
  on conflict (id) do update set
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    online = excluded.online;
end $$;

select public._seed_demo_user(
  '111111111-1111-1111-1111-111111111101'::uuid,
  'lin@demo.talklov.com', '林晓 Lin', 'lin', 26, 'female', 'CN', '上海',
  '中文', 'English', 'Intermediate',
  array['language','friends'], array['咖啡','摄影','独立电影'],
  '上海的产品经理，想练口语，也想认识世界各地有趣的人。',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop',
  'mandarin', 'public', true, true
);

select public._seed_demo_user(
  '111111111-1111-1111-1111-111111111102'::uuid,
  'mei@demo.talklov.com', '美琪 Maggie', 'mei', 24, 'female', 'CN', '成都',
  '中文', 'English', 'Beginner',
  array['language','romance'], array['火锅','汉服','旅行'],
  '成都妹子，英语小白但很努力！想找耐心的语伴。',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop',
  'mandarin', 'loggedIn', true, false
);

select public._seed_demo_user(
  '111111111-1111-1111-1111-111111111103'::uuid,
  'jack@demo.talklov.com', 'Jack', 'jack', 29, 'male', 'US', 'Austin',
  'English', '中文', 'Beginner',
  array['language','friends'], array['篮球','科技','咖啡'],
  'Software engineer learning Mandarin. Love good coffee and live music.',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop',
  null, 'public', true, true
);

select public._seed_demo_user(
  'a1111111-1111-1111-1111-111111111104'::uuid,
  'yuki@demo.talklov.com', '雨桐 Tina', 'yuki', 27, 'female', 'CN', '北京',
  '中文', 'English', 'Advanced',
  array['friends','romance'], array['设计','博物馆','跑步'],
  '北京，做设计。喜欢深度对话，想认识价值观相近的人。',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop',
  'mandarin', 'verified', true, true
);

select public._seed_demo_user(
  'a1111111-1111-1111-1111-111111111105'::uuid,
  'ryan@demo.talklov.com', 'Ryan', 'ryan', 31, 'male', 'US', 'Seattle',
  'English', '中文', 'Intermediate',
  array['language','romance'], array['徒步','烹饪','爵士'],
  'Product manager who fell in love with Chinese food and culture.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop',
  null, 'public', false, false
);

select public._seed_demo_user(
  'a1111111-1111-1111-1111-111111111106'::uuid,
  'shan@demo.talklov.com', '珊珊 Shan', 'shan', 23, 'female', 'CN', '广州',
  '中文', 'English', 'Intermediate',
  array['language','friends','romance'], array['奶茶','追剧','画画','旅行'],
  '广州女孩，想练英语顺便交个外国朋友，看缘分啦～ 我说粤语也说普通话！',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop',
  'cantonese', 'public', true, true
);

drop function if exists public._seed_demo_user;
