-- 이스터에그 공유 카운터 (배고픈 숭이에게 용돈 주기)
-- 모든 팀원의 클릭이 단일 row에 누적됨

create table if not exists public.easter_egg_counter (
  id smallint primary key default 1,
  total_amount bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint easter_egg_counter_single_row check (id = 1)
);

insert into public.easter_egg_counter (id, total_amount)
values (1, 0)
on conflict (id) do nothing;

-- 원자적 증가용 RPC: 동시 클릭 경쟁 조건 방지
create or replace function public.increment_easter_egg(delta integer)
returns bigint
language plpgsql
security definer
set search_path = public
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

  return new_total;
end;
$$;

comment on table public.easter_egg_counter is
  '/monthly 빈 상태 이스터에그의 전사 누적 금액 카운터 (단일 row).';

comment on function public.increment_easter_egg(integer) is
  '이스터에그 카운터를 원자적으로 증가시키고 새 total_amount를 반환.';
