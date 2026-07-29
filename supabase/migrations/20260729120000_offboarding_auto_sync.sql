-- 조직 구성에서 인원을 '퇴사'로 설정하면 오프보딩 요청을 자동으로 생성한다.
-- API(POST /api/member-statuses, PUT /api/member-statuses/[id])가 여러 경로로
-- 나뉘어 있어, 모든 경로를 한 번에 덮도록 테이블 트리거로 처리한다.

CREATE OR REPLACE FUNCTION public.sync_offboarding_from_member_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- 이미 진행 중이거나 완료된 오프보딩이 있으면 새로 만들지 않는다.
  IF EXISTS (
    SELECT 1
    FROM public.offboarding_requests
    WHERE member_id = NEW.member_id
      AND status IN ('pending', 'approved', 'completed')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.offboarding_requests (
    member_id,
    requested_final_working_date,
    reason,
    note
  )
  VALUES (
    NEW.member_id,
    NEW.start_date,
    '조직 구성에서 퇴사로 설정되어 자동 생성되었습니다.',
    NEW.note
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_offboarding_from_member_status
  ON public.member_statuses;
CREATE TRIGGER sync_offboarding_from_member_status
  AFTER INSERT OR UPDATE OF status, start_date ON public.member_statuses
  FOR EACH ROW
  WHEN (NEW.status = '퇴사')
  EXECUTE FUNCTION public.sync_offboarding_from_member_status();

NOTIFY pgrst, 'reload schema';
