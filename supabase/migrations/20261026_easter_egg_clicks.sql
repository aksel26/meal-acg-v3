-- 이스터에그 클릭 기록: 누가 언제 얼마를 눌렀는지 남긴다 (조회 화면 없음, DB 저장만)

create table if not exists public.easter_egg_clicks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  user_name text,
  delta integer not null,
  created_at timestamptz not null default now()
);

create index if not exists easter_egg_clicks_created_at_idx
  on public.easter_egg_clicks (created_at desc);

-- 정책 없이 RLS만 켠다: service_role과 아래 security definer 함수만 쓴다
alter table public.easter_egg_clicks enable row level security;

-- 카운터 증가와 클릭 기록을 한 트랜잭션에서 처리한다.
-- 인자를 늘리면서 default를 주므로 기존 호출(delta만)도 그대로 동작한다.
-- 같은 이름의 오버로드가 남으면 PostgREST가 후보를 못 고르므로 옛 시그니처는 지운다.
drop function if exists public.increment_easter_egg(integer);

create or replace function public.increment_easter_egg(
  delta integer,
  p_member_id uuid default null,
  p_user_name text default null
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_total bigint;
begin
  if delta is null or delta <= 0 then
    raise exception 'delta must be positive';
  end if;

  update public.easter_egg_counter
  set total_amount = total_amount + delta,
      updated_at = now()
  where id = 1
  returning total_amount into new_total;

  insert into public.easter_egg_clicks (member_id, user_name, delta)
  values (p_member_id, p_user_name, delta);

  return new_total;
end;
$$;

comment on function public.increment_easter_egg(integer, uuid, text) is
  '이스터에그 카운터를 원자적으로 증가시키고 클릭 기록을 남긴 뒤 새 total_amount를 반환.';

revoke all on function public.increment_easter_egg(integer, uuid, text) from public;
revoke execute on function public.increment_easter_egg(integer, uuid, text) from anon, authenticated;
grant execute on function public.increment_easter_egg(integer, uuid, text) to service_role;
