-- ============================================================
-- Phase 4: 승인 워크플로 마이그레이션
-- - approval_requests 테이블 생성
-- - dayoffs.approval_status 컬럼 추가
-- - 승인라인 자동 결정 RPC 함수
-- ============================================================

-- ============================================================
-- 1. approval_requests 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS approval_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text        NOT NULL CHECK (type IN ('leave', 'overtime')),
  requester_id    uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  approver_id     uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  cc_member_ids   uuid[]      DEFAULT '{}',
  related_table   text,
  related_id      uuid,
  reject_reason   text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     uuid        REFERENCES members(id) ON DELETE SET NULL
);

COMMENT ON TABLE approval_requests IS '승인 요청 테이블';
COMMENT ON COLUMN approval_requests.type IS '요청 유형: leave(휴가), overtime(초과근무)';
COMMENT ON COLUMN approval_requests.requester_id IS '신청자';
COMMENT ON COLUMN approval_requests.approver_id IS '승인자 (자동 결정)';
COMMENT ON COLUMN approval_requests.status IS 'pending/approved/rejected';
COMMENT ON COLUMN approval_requests.cc_member_ids IS '참조자 목록';
COMMENT ON COLUMN approval_requests.related_table IS '연관 테이블명 (dayoffs, attendance_records 등)';
COMMENT ON COLUMN approval_requests.related_id IS '연관 레코드 ID';

CREATE INDEX idx_approval_requests_approver_status
  ON approval_requests (approver_id, status);
CREATE INDEX idx_approval_requests_requester
  ON approval_requests (requester_id);
CREATE INDEX idx_approval_requests_related
  ON approval_requests (related_table, related_id);

-- ============================================================
-- 2. dayoffs.approval_status 컬럼 추가
-- ============================================================

ALTER TABLE dayoffs
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));

COMMENT ON COLUMN dayoffs.approval_status IS '승인 상태: draft(임시), pending(대기), approved(승인), rejected(반려). 기존 데이터는 approved로 설정';

-- ============================================================
-- 3. 승인라인 자동 결정 RPC 함수
-- 규칙:
--   팀원/파트장 → 같은 팀의 팀장
--   팀장 → 같은 본부의 본부장
--   본부장 → 대표
--   본부장 부재 시 → 대표
-- ============================================================

CREATE OR REPLACE FUNCTION get_approver_for_member(p_member_id uuid)
RETURNS uuid AS $$
DECLARE
  v_title_name    text;
  v_team_id       uuid;
  v_division_id   uuid;
  v_approver_id   uuid;
BEGIN
  -- 신청자의 직책, 팀, 본부 조회
  SELECT t.name, m.team_id, tm.division_id
    INTO v_title_name, v_team_id, v_division_id
    FROM members m
    LEFT JOIN titles t ON t.id = m.title_id
    LEFT JOIN teams tm ON tm.id = m.team_id
   WHERE m.id = p_member_id;

  -- 본부장 → 대표
  IF v_title_name = '본부장' THEN
    SELECT m.id INTO v_approver_id
      FROM members m
      JOIN titles t ON t.id = m.title_id
     WHERE t.name = '대표'
     LIMIT 1;
    RETURN v_approver_id;
  END IF;

  -- 팀장 → 같은 본부의 본부장, 없으면 대표
  IF v_title_name = '팀장' THEN
    -- 같은 본부의 본부장 찾기
    IF v_division_id IS NOT NULL THEN
      SELECT m.id INTO v_approver_id
        FROM members m
        JOIN titles t ON t.id = m.title_id
        JOIN teams tm ON tm.id = m.team_id
       WHERE t.name = '본부장'
         AND tm.division_id = v_division_id
         AND m.id != p_member_id
       LIMIT 1;
    END IF;

    -- 본부장 없으면 대표
    IF v_approver_id IS NULL THEN
      SELECT m.id INTO v_approver_id
        FROM members m
        JOIN titles t ON t.id = m.title_id
       WHERE t.name = '대표'
       LIMIT 1;
    END IF;

    RETURN v_approver_id;
  END IF;

  -- 팀원/파트장 → 같은 팀의 팀장
  IF v_team_id IS NOT NULL THEN
    SELECT m.id INTO v_approver_id
      FROM members m
      JOIN titles t ON t.id = m.title_id
     WHERE t.name = '팀장'
       AND m.team_id = v_team_id
       AND m.id != p_member_id
     LIMIT 1;
  END IF;

  -- 팀장 없으면 본부장 → 대표 순서로 fallback
  IF v_approver_id IS NULL AND v_division_id IS NOT NULL THEN
    SELECT m.id INTO v_approver_id
      FROM members m
      JOIN titles t ON t.id = m.title_id
      JOIN teams tm ON tm.id = m.team_id
     WHERE t.name = '본부장'
       AND tm.division_id = v_division_id
     LIMIT 1;
  END IF;

  IF v_approver_id IS NULL THEN
    SELECT m.id INTO v_approver_id
      FROM members m
      JOIN titles t ON t.id = m.title_id
     WHERE t.name = '대표'
     LIMIT 1;
  END IF;

  RETURN v_approver_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_approver_for_member IS '멤버의 승인라인(승인자)을 자동 결정하는 함수';
