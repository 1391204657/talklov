-- Allow multi Chinese variants stored as comma-separated text
-- e.g. 'mandarin', 'cantonese', or 'mandarin,cantonese'
alter table profiles drop constraint if exists profiles_chinese_variant_check;
