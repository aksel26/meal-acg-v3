-- 점심조 조당 최소 인원 설정 추가
-- 기존 max_members_per_group(최대)과 짝을 이루며, 관리자가 배정 설정 카드에서 직접 입력한다.

alter table public.lunch_group_settings
  add column if not exists min_members_per_group integer not null default 3;

alter table public.lunch_group_settings
  alter column max_members_per_group set default 4;

alter table public.lunch_group_settings
  drop constraint if exists lunch_group_settings_member_range_check;

alter table public.lunch_group_settings
  add constraint lunch_group_settings_member_range_check
  check (min_members_per_group >= 1 and min_members_per_group <= max_members_per_group);

comment on column public.lunch_group_settings.min_members_per_group is
  '조당 최소 인원. 이 값을 못 채우는 조가 생기면 조 개수를 줄이고 최대 인원 초과를 허용한다.';
