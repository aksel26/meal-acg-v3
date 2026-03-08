-- ============================================================
-- 근태(DayOff) 모듈 마이그레이션
-- leave_types: 근태 유형 참조 테이블 (16개)
-- dayoffs: 근태 기록 메인 테이블
-- ============================================================

-- 1. leave_types 테이블
CREATE TABLE leave_types (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_type TEXT NOT NULL DEFAULT 'full'
    CHECK (duration_type IN ('full', 'morning', 'afternoon')),
  include_in_stats BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE leave_types IS '근태 유형 참조 테이블';
COMMENT ON COLUMN leave_types.category IS '지각/조퇴, 반차, 연차, 대체휴무, 경조휴무, 특별휴무, 훈련, 휴무';
COMMENT ON COLUMN leave_types.duration_type IS 'full=종일, morning=오전, afternoon=오후';
COMMENT ON COLUMN leave_types.include_in_stats IS '통계 집계 포함 여부';

-- 2. leave_types 기초 데이터 (16개)
INSERT INTO leave_types (id, name, category, duration_type, include_in_stats, sort_order) VALUES
  (1,  '지각',       '지각/조퇴',  'full',      true,  1),
  (2,  '조퇴',       '지각/조퇴',  'full',      true,  2),
  (3,  '오전반차',    '반차',      'morning',   true,  3),
  (4,  '오후반차',    '반차',      'afternoon', true,  4),
  (5,  '연차',       '연차',      'full',      true,  5),
  (6,  '대체휴무',    '대체휴무',   'full',      true,  6),
  (7,  '경조휴무',    '경조휴무',   'full',      true,  7),
  (8,  '특별휴무',    '특별휴무',   'full',      true,  8),
  (9,  '훈련',       '훈련',      'full',      true,  9),
  (10, '휴무',       '휴무',      'full',      true,  10),
  (11, '대체휴무(오전)', '대체휴무', 'morning',   true,  11),
  (12, '대체휴무(오후)', '대체휴무', 'afternoon', true,  12),
  (13, '특별휴무(오전)', '특별휴무', 'morning',   true,  13),
  (14, '특별휴무(오후)', '특별휴무', 'afternoon', true,  14),
  (15, '훈련(오전)',    '훈련',     'morning',   true,  15),
  (16, '훈련(오후)',    '훈련',     'afternoon', true,  16);

-- 3. dayoffs 메인 테이블
CREATE TABLE dayoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  leave_type_id INT NOT NULL REFERENCES leave_types(id),
  late_hour VARCHAR(2),
  late_minute VARCHAR(2),
  cc_member_ids UUID[] DEFAULT '{}',
  reason TEXT,
  approver_id UUID REFERENCES members(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  last_editor_id UUID REFERENCES members(id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dayoffs IS '근태 기록 메인 테이블';
COMMENT ON COLUMN dayoffs.author_id IS '작성자 (members FK)';
COMMENT ON COLUMN dayoffs.target_id IS '대상자 (members FK)';
COMMENT ON COLUMN dayoffs.leave_date IS '근태 일자';
COMMENT ON COLUMN dayoffs.leave_type_id IS '근태 유형 (leave_types FK)';
COMMENT ON COLUMN dayoffs.late_hour IS '지각 시 (09, 10, 11) - leave_type_id=1 전용';
COMMENT ON COLUMN dayoffs.late_minute IS '지각 분 (00~55, 5분 단위) - leave_type_id=1 전용';
COMMENT ON COLUMN dayoffs.cc_member_ids IS '참조자 member ID 배열';
COMMENT ON COLUMN dayoffs.approver_id IS '승인자 (NULL=미승인)';
COMMENT ON COLUMN dayoffs.is_deleted IS '소프트 삭제 여부';

-- 4. 인덱스
CREATE INDEX idx_dayoffs_target_date ON dayoffs (target_id, leave_date) WHERE is_deleted = false;
CREATE INDEX idx_dayoffs_leave_date ON dayoffs (leave_date) WHERE is_deleted = false;
CREATE INDEX idx_dayoffs_author ON dayoffs (author_id) WHERE is_deleted = false;
CREATE INDEX idx_dayoffs_approved ON dayoffs (approver_id) WHERE is_deleted = false AND approver_id IS NULL;

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_dayoffs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dayoffs_updated_at
  BEFORE UPDATE ON dayoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_dayoffs_updated_at();

-- 6. 월별 근태 통계 RPC (전체 유형 집계 - 기존 버그 수정)
CREATE OR REPLACE FUNCTION get_dayoff_monthly_stats(
  p_year INT,
  p_month INT
)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  team_name TEXT,
  leave_type_id INT,
  leave_type_name TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.target_id AS member_id,
    m.full_name AS member_name,
    t.name AS team_name,
    d.leave_type_id,
    lt.name AS leave_type_name,
    COUNT(*)::BIGINT AS count
  FROM dayoffs d
  JOIN members m ON m.id = d.target_id
  JOIN leave_types lt ON lt.id = d.leave_type_id
  LEFT JOIN teams t ON t.id = m.team_id
  WHERE d.is_deleted = false
    AND EXTRACT(YEAR FROM d.leave_date) = p_year
    AND EXTRACT(MONTH FROM d.leave_date) = p_month
  GROUP BY d.target_id, m.full_name, t.name, d.leave_type_id, lt.name
  ORDER BY m.full_name, d.leave_type_id;
END;
$$ LANGUAGE plpgsql STABLE;
