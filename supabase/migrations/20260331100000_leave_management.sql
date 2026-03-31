-- ============================================================
-- 연차 관리 스키마 마이그레이션
-- - leave_types 테이블 확장 (is_system, deducts_annual 등)
-- - leave_balances 테이블 생성
-- - leave_adjustments 테이블 생성
-- - dayoffs INSERT/UPDATE 시 leave_balances.used 자동 차감 트리거
-- - generate_annual_leave(p_year) RPC 함수
-- ============================================================

-- 0. members.hire_date 컬럼 추가 (generate_annual_leave RPC에서 필요)
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS hire_date DATE;

-- ============================================================
-- 1. leave_types 테이블 확장
-- ============================================================

ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS is_system         boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deducts_annual    boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deduction_amount  decimal(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_separate_quota boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_quota     integer      NOT NULL DEFAULT 0;

-- 기존 유형 업데이트
-- id 1(지각), 2(조퇴): is_system=true
UPDATE leave_types SET is_system = true, deducts_annual = false, deduction_amount = 0
WHERE id IN (1, 2);

-- id 3(오전반차), 4(오후반차): 0.5일 차감
UPDATE leave_types SET is_system = true, deducts_annual = true, deduction_amount = 0.5
WHERE id IN (3, 4);

-- id 5(연차): 1일 차감
UPDATE leave_types SET is_system = true, deducts_annual = true, deduction_amount = 1
WHERE id = 5;

-- id 6~16: 차감 없음
UPDATE leave_types SET deducts_annual = false, deduction_amount = 0
WHERE id BETWEEN 6 AND 16;

-- 새 유형 추가
INSERT INTO leave_types (id, name, category, duration_type, include_in_stats, sort_order,
                          is_system, deducts_annual, deduction_amount, has_separate_quota, default_quota)
VALUES
  (17, '오전반반차',  '반반차',   'morning',   true, 17, true,  true,  0.25, false, 0),
  (18, '오후반반차',  '반반차',   'afternoon', true, 18, true,  true,  0.25, false, 0),
  (19, '하계휴가',    '하계휴가', 'full',      true, 19, false, false, 0,    true,  3),
  (20, '공제',        '공제',     'full',      true, 20, false, false, 0,    false, 0),
  (21, '무급휴가',    '무급휴가', 'full',      true, 21, false, false, 0,    false, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. leave_balances 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_balances (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  year        integer      NOT NULL,
  type        text         NOT NULL CHECK (type IN ('monthly', 'annual', 'summer')),
  granted     decimal(5,2) NOT NULL DEFAULT 0,
  used        decimal(5,2) NOT NULL DEFAULT 0,
  adjusted    decimal(5,2) NOT NULL DEFAULT 0,
  note        text,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (member_id, year, type)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_member_year ON leave_balances(member_id, year);

-- ============================================================
-- 3. leave_adjustments 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_adjustments (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_id   uuid         NOT NULL REFERENCES leave_balances(id) ON DELETE CASCADE,
  adjusted_by  uuid         NOT NULL REFERENCES members(id),
  amount       decimal(5,2) NOT NULL,
  reason       text,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_adjustments_balance ON leave_adjustments(balance_id);

-- ============================================================
-- 4. leave_balances updated_at 트리거
-- ============================================================

CREATE OR REPLACE TRIGGER set_leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. dayoffs INSERT/UPDATE → leave_balances.used 자동 증감 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_leave_balance_on_dayoff()
RETURNS TRIGGER AS $$
DECLARE
  v_deducts_annual   boolean;
  v_deduction_amount decimal(3,2);
  v_year             integer;
  v_delta            decimal(5,2);
  v_balance_id       uuid;
BEGIN
  -- 변경 대상이 연차 차감 대상인지 조회
  SELECT lt.deducts_annual, lt.deduction_amount
    INTO v_deducts_annual, v_deduction_amount
    FROM leave_types lt
   WHERE lt.id = COALESCE(NEW.leave_type_id, OLD.leave_type_id);

  -- 차감 대상이 아니면 종료
  IF NOT COALESCE(v_deducts_annual, false) OR COALESCE(v_deduction_amount, 0) = 0 THEN
    RETURN NEW;
  END IF;

  v_year := EXTRACT(YEAR FROM COALESCE(NEW.leave_date, OLD.leave_date))::integer;

  -- INSERT (신규 근태, is_deleted=false) → used 증가
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    v_delta := v_deduction_amount;

  -- UPDATE: is_deleted false → true (소프트 삭제) → used 감소
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    v_delta := -v_deduction_amount;

  ELSE
    RETURN NEW;
  END IF;

  -- annual 잔액 우선 차감, 없으면 monthly 차감
  SELECT id INTO v_balance_id
    FROM leave_balances
   WHERE member_id = COALESCE(NEW.target_id, OLD.target_id)
     AND year = v_year
     AND type = 'annual'
   LIMIT 1;

  IF v_balance_id IS NOT NULL THEN
    UPDATE leave_balances
       SET used = GREATEST(0, used + v_delta),
           updated_at = now()
     WHERE id = v_balance_id;
  ELSE
    SELECT id INTO v_balance_id
      FROM leave_balances
     WHERE member_id = COALESCE(NEW.target_id, OLD.target_id)
       AND year = v_year
       AND type = 'monthly'
     LIMIT 1;

    IF v_balance_id IS NOT NULL THEN
      UPDATE leave_balances
         SET used = GREATEST(0, used + v_delta),
             updated_at = now()
       WHERE id = v_balance_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_dayoff_leave_balance
  AFTER INSERT OR UPDATE OF is_deleted ON dayoffs
  FOR EACH ROW EXECUTE FUNCTION update_leave_balance_on_dayoff();

-- ============================================================
-- 6. generate_annual_leave(p_year) RPC 함수
-- ============================================================

CREATE OR REPLACE FUNCTION generate_annual_leave(p_year integer)
RETURNS integer AS $$
DECLARE
  rec              RECORD;
  v_granted        decimal(5,2);
  v_type           text;
  v_hire_year      integer;
  v_years_employed integer;
  v_accrual        integer;
  v_processed      integer := 0;
BEGIN
  FOR rec IN
    SELECT
      m.id,
      m.hire_date,
      p.annual_leave_days,
      p.leave_accrual_rule
    FROM members m
    JOIN positions p ON p.id = m.position_id
    -- 퇴사자 제외: 현재 유효한 status가 '퇴사'인 멤버 제외
    WHERE NOT EXISTS (
      SELECT 1 FROM member_statuses ms
       WHERE ms.member_id = m.id
         AND ms.status = '퇴사'
         AND ms.start_date <= CURRENT_DATE
         AND (ms.end_date IS NULL OR ms.end_date >= CURRENT_DATE)
    )
    AND m.hire_date IS NOT NULL
  LOOP
    -- 인턴(annual_leave_days=0): 건너뜀
    IF rec.annual_leave_days = 0 THEN
      -- 하계휴가도 인턴은 제외
      CONTINUE;
    END IF;

    v_hire_year := EXTRACT(YEAR FROM rec.hire_date)::integer;

    -- 입사 당해: 월차 = 12 - 입사월
    IF v_hire_year = p_year THEN
      v_type    := 'monthly';
      v_granted := 12 - EXTRACT(MONTH FROM rec.hire_date)::integer;

    -- 입사 다음해: 비례연차
    ELSIF v_hire_year = p_year - 1 THEN
      v_type    := 'annual';
      v_granted := ROUND(
        15.0 * (MAKE_DATE(p_year, 1, 1) - rec.hire_date)::numeric / 365,
        1
      );

    -- 그 외: 기본 연차 + 가산
    ELSE
      v_type           := 'annual';
      v_years_employed := p_year - v_hire_year;
      v_accrual        := 0;

      IF rec.leave_accrual_rule = '+1_per_3yr' THEN
        v_accrual := v_years_employed / 3;
      END IF;

      v_granted := rec.annual_leave_days + v_accrual;
    END IF;

    -- monthly / annual 부여 (ON CONFLICT DO UPDATE)
    INSERT INTO leave_balances (member_id, year, type, granted)
    VALUES (rec.id, p_year, v_type, v_granted)
    ON CONFLICT (member_id, year, type)
    DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();

    -- 하계휴가: 인턴 제외 전원 3일 (ON CONFLICT DO NOTHING)
    INSERT INTO leave_balances (member_id, year, type, granted)
    VALUES (rec.id, p_year, 'summer', 3)
    ON CONFLICT (member_id, year, type) DO NOTHING;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$ LANGUAGE plpgsql;
