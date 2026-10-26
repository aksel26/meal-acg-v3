-- 점심조 무결성 보강
-- 1) 뽑기(assign_lunch_group)와 admin 이동(move_lunch_group_member)을 DB 함수 안에서
--    주차 단위 행 잠금(FOR UPDATE)으로 직렬화한다. 동시 뽑기·정원 초과·중복 배정을 막는다.
-- 2) 조 구성 변경 이력을 lunch_group_audit_logs에 남긴다.
-- 기존 테이블·데이터는 건드리지 않는다 (추가만).

-- ---------------------------------------------------------------
-- 조작 기록 테이블
-- ---------------------------------------------------------------
create table if not exists public.lunch_group_audit_logs (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  -- draw | assign | move | remove | create_table | reset | move_slot | exclude | restore
  action text not null,
  member_id uuid references public.members(id) on delete set null,
  from_group_number integer,
  to_group_number integer,
  changed_by uuid references public.members(id) on delete set null,
  detail jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists lunch_group_audit_logs_week_idx
  on public.lunch_group_audit_logs (week_start_date, changed_at desc);

-- 정책 없이 RLS만 켠다: service_role과 security definer 함수만 쓴다
alter table public.lunch_group_audit_logs enable row level security;

-- ---------------------------------------------------------------
-- 뽑기: 빈 자리가 있는 조 중 하나를 랜덤으로 골라 배정한다
-- ---------------------------------------------------------------
create or replace function public.assign_lunch_group(
  p_member_id uuid,
  p_week_start_date date
)
returns table (group_id uuid, group_number integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group_id uuid;
  v_group_number integer;
begin
  -- 같은 주차 조 행을 잠가 동시 뽑기를 한 줄로 세운다
  perform 1 from lunch_groups g
   where g.week_start_date = p_week_start_date
     for update;
  if not found then
    raise exception '이번 주 점심조가 아직 생성되지 않았습니다. 관리자에게 문의하세요.';
  end if;

  if exists (
    select 1 from lunch_group_excluded_members e
     where e.member_id = p_member_id
       and e.week_start_date = p_week_start_date
  ) then
    raise exception '이번 주 점심조 추첨에서 제외된 인원입니다.';
  end if;

  if exists (
    select 1
      from lunch_group_members m
      join lunch_groups g on g.id = m.group_id
     where g.week_start_date = p_week_start_date
       and m.user_id = p_member_id
  ) then
    raise exception '이미 점심조에 배정되어 있습니다.';
  end if;

  select g.id, g.group_number
    into v_group_id, v_group_number
    from lunch_groups g
    left join lunch_group_members m on m.group_id = g.id
   where g.week_start_date = p_week_start_date
   group by g.id, g.group_number, g.max_slots
  having count(m.id) < coalesce(g.max_slots, 4)
   order by random()
   limit 1;

  if v_group_id is null then
    raise exception '빈 자리가 없습니다.';
  end if;

  insert into lunch_group_members (group_id, user_id, assigned_at)
  values (v_group_id, p_member_id, now());

  insert into lunch_group_audit_logs (week_start_date, action, member_id, to_group_number, changed_by)
  values (p_week_start_date, 'draw', p_member_id, v_group_number, p_member_id);

  group_id := v_group_id;
  group_number := v_group_number;
  return next;
end
$$;

revoke all on function public.assign_lunch_group(uuid, date) from public;
grant execute on function public.assign_lunch_group(uuid, date) to service_role;

-- ---------------------------------------------------------------
-- admin 이동: 특정 조로 옮기거나(p_target_group_number) 조에서 뺀다(null)
-- ---------------------------------------------------------------
create or replace function public.move_lunch_group_member(
  p_week_start_date date,
  p_member_id uuid,
  p_target_group_number integer,
  p_changed_by uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_from_group_number integer;
  v_target_group_id uuid;
  v_target_max integer;
  v_target_count integer;
begin
  perform 1 from lunch_groups g
   where g.week_start_date = p_week_start_date
     for update;
  if not found then
    raise exception '해당 주차 점심조가 없습니다.';
  end if;

  select g.group_number
    into v_from_group_number
    from lunch_group_members m
    join lunch_groups g on g.id = m.group_id
   where g.week_start_date = p_week_start_date
     and m.user_id = p_member_id;

  -- 조에서 제거
  if p_target_group_number is null then
    if v_from_group_number is null then
      return;
    end if;

    delete from lunch_group_members m
     using lunch_groups g
     where g.id = m.group_id
       and g.week_start_date = p_week_start_date
       and m.user_id = p_member_id;

    insert into lunch_group_audit_logs (week_start_date, action, member_id, from_group_number, changed_by)
    values (p_week_start_date, 'remove', p_member_id, v_from_group_number, p_changed_by);
    return;
  end if;

  -- 같은 조로 옮기는 건 무시
  if v_from_group_number = p_target_group_number then
    return;
  end if;

  select g.id, coalesce(g.max_slots, 4)
    into v_target_group_id, v_target_max
    from lunch_groups g
   where g.week_start_date = p_week_start_date
     and g.group_number = p_target_group_number;
  if v_target_group_id is null then
    raise exception '%조가 없습니다.', p_target_group_number;
  end if;

  select count(*) into v_target_count
    from lunch_group_members m
   where m.group_id = v_target_group_id;
  if v_target_count >= v_target_max then
    raise exception '%조가 가득 찼습니다.', p_target_group_number;
  end if;

  if v_from_group_number is null then
    insert into lunch_group_members (group_id, user_id, assigned_at)
    values (v_target_group_id, p_member_id, now());
  else
    update lunch_group_members m
       set group_id = v_target_group_id
      from lunch_groups g
     where g.id = m.group_id
       and g.week_start_date = p_week_start_date
       and m.user_id = p_member_id;
  end if;

  insert into lunch_group_audit_logs (week_start_date, action, member_id, from_group_number, to_group_number, changed_by)
  values (
    p_week_start_date,
    case when v_from_group_number is null then 'assign' else 'move' end,
    p_member_id, v_from_group_number, p_target_group_number, p_changed_by
  );
end
$$;

revoke all on function public.move_lunch_group_member(date, uuid, integer, uuid) from public;
grant execute on function public.move_lunch_group_member(date, uuid, integer, uuid) to service_role;
