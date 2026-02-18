# Supabase 복지포인트/활동비 관리 시스템 구현 프롬프트

## 프로젝트 개요

사내 복지포인트 및 활동비를 관리하는 시스템을 Supabase 기반으로 구현한다.
Admin은 조직 구성, 포인트/활동비 할당, 사용내역 검토를 수행하고,
User는 사용내역 기록 및 조회를 수행한다.

---

## 1. 데이터베이스 스키마 (Supabase SQL)

### 1-1. 조직 구조 테이블

조직은 **조직 > 본부(선택) > 팀** 구조를 가진다.
본부가 없는 경우도 허용한다. (예: P&C처럼 조직 직속 팀)

```sql
-- 조직 (최상위)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 본부 (선택적 중간 계층)
CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 팀
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL, -- NULL이면 본부 없이 조직 직속
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1-2. 사용자/멤버 테이블

역할(role)에 따라 활동비 접근 권한이 달라진다.

```sql
-- 역할 ENUM
CREATE TYPE member_role AS ENUM ('본부장', '팀장', '팀원');

-- 멤버
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Supabase Auth 연동
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role member_role NOT NULL DEFAULT '팀원',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1-3. 예산 할당 테이블

복지포인트와 활동비를 **기간(월/분기/연)** 단위로 각 멤버에게 할당한다.

```sql
-- 예산 유형
CREATE TYPE budget_type AS ENUM ('복지포인트', '활동비');

-- 예산 할당
CREATE TABLE budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type budget_type NOT NULL,
  period TEXT NOT NULL, -- 예: '2025-Q1', '2025-01', '2025' 등 자유 형식
  total_amount INTEGER NOT NULL DEFAULT 0, -- 할당된 총 금액 (원)
  description TEXT, -- 산정 기준 메모 (예: "본인 200,000원 + 200,000원 × 13명")
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 활동비는 팀장 이상만 할당 가능하도록 CHECK 또는 트리거로 제어
-- (RLS + 애플리케이션 레벨에서 이중 검증)
```

### 1-4. 사용내역 테이블

```sql
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL REFERENCES budget_allocations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type budget_type NOT NULL,
  amount INTEGER NOT NULL, -- 사용 금액 (원)
  description TEXT NOT NULL, -- 사용처
  used_at DATE NOT NULL, -- 사용 날짜
  companions UUID[] DEFAULT '{}', -- 동반결제 인원 (member_id 배열)
  receipt_url TEXT, -- 영수증 이미지 URL (Supabase Storage)

  -- 검토 관련
  is_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES members(id),
  reviewed_at TIMESTAMPTZ,

  -- 검토 완료 후 수정 시 수정 이력
  last_modified_by UUID REFERENCES members(id),
  last_modified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1-5. 검토 후 수정 이력 테이블 (audit log)

검토 완료된 내역을 admin이 수정/삭제할 때 이력을 남긴다.

```sql
CREATE TABLE usage_record_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_record_id UUID NOT NULL REFERENCES usage_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'UPDATE' | 'DELETE'
  changed_by UUID NOT NULL REFERENCES members(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  previous_data JSONB, -- 변경 전 데이터 스냅샷
  new_data JSONB -- 변경 후 데이터 스냅샷 (DELETE 시 NULL)
);
```

### 1-6. 인덱스

```sql
CREATE INDEX idx_members_org ON members(organization_id);
CREATE INDEX idx_members_team ON members(team_id);
CREATE INDEX idx_members_user ON members(user_id);
CREATE INDEX idx_budget_member ON budget_allocations(member_id);
CREATE INDEX idx_budget_type_period ON budget_allocations(type, period);
CREATE INDEX idx_usage_member ON usage_records(member_id);
CREATE INDEX idx_usage_allocation ON usage_records(allocation_id);
CREATE INDEX idx_usage_type ON usage_records(type);
CREATE INDEX idx_usage_reviewed ON usage_records(is_reviewed);
```

### 1-7. updated_at 자동 갱신 트리거

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 적용
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_divisions_updated BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_budget_updated BEFORE UPDATE ON budget_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_usage_updated BEFORE UPDATE ON usage_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 2. RLS (Row Level Security) 정책

```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_record_audit_logs ENABLE ROW LEVEL SECURITY;

-- 헬퍼 함수: 현재 로그인 유저의 member 정보 조회
CREATE OR REPLACE FUNCTION get_current_member()
RETURNS members AS $$
  SELECT * FROM members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM members WHERE user_id = auth.uid() LIMIT 1), FALSE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_member_role()
RETURNS member_role AS $$
  SELECT role FROM members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- organizations: 같은 조직 소속이면 읽기 가능, admin만 쓰기
-- ============================================
CREATE POLICY "org_select" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM members WHERE user_id = auth.uid())
);
CREATE POLICY "org_admin_all" ON organizations FOR ALL USING (is_current_user_admin());

-- ============================================
-- divisions / teams: 같은 조직이면 읽기 가능, admin만 쓰기
-- ============================================
CREATE POLICY "div_select" ON divisions FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM members WHERE user_id = auth.uid())
);
CREATE POLICY "div_admin_all" ON divisions FOR ALL USING (is_current_user_admin());

CREATE POLICY "team_select" ON teams FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM members WHERE user_id = auth.uid())
);
CREATE POLICY "team_admin_all" ON teams FOR ALL USING (is_current_user_admin());

-- ============================================
-- members: 같은 조직이면 읽기 가능, admin만 쓰기
-- ============================================
CREATE POLICY "member_select" ON members FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM members WHERE user_id = auth.uid())
);
CREATE POLICY "member_admin_all" ON members FOR ALL USING (is_current_user_admin());

-- ============================================
-- budget_allocations: 같은 조직이면 읽기 가능, admin만 쓰기
-- ============================================
CREATE POLICY "budget_select" ON budget_allocations FOR SELECT USING (
  member_id IN (SELECT id FROM members WHERE organization_id IN (
    SELECT organization_id FROM members WHERE user_id = auth.uid()
  ))
);
CREATE POLICY "budget_admin_all" ON budget_allocations FOR ALL USING (is_current_user_admin());

-- ============================================
-- usage_records: 조직 내 모든 인원이 열람 가능
-- ============================================

-- 읽기: 같은 조직이면 전체 열람 가능
CREATE POLICY "usage_select" ON usage_records FOR SELECT USING (
  member_id IN (SELECT id FROM members WHERE organization_id IN (
    SELECT organization_id FROM members WHERE user_id = auth.uid()
  ))
);

-- 쓰기(INSERT): 본인 내역만 작성 가능
-- 활동비는 팀장 이상만 작성 가능 (애플리케이션에서도 이중 검증)
CREATE POLICY "usage_insert" ON usage_records FOR INSERT WITH CHECK (
  member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
  AND (
    type = '복지포인트'
    OR (type = '활동비' AND current_member_role() IN ('본부장', '팀장'))
  )
);

-- 수정(UPDATE): 본인 내역 + 검토 완료되지 않은 것만
-- admin은 검토 완료된 것도 수정 가능 (audit log 기록은 애플리케이션에서 처리)
CREATE POLICY "usage_update_own" ON usage_records FOR UPDATE USING (
  (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    AND is_reviewed = FALSE
  )
  OR is_current_user_admin()
) WITH CHECK (
  (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    AND is_reviewed = FALSE
  )
  OR is_current_user_admin()
);

-- 삭제(DELETE): 본인 내역 + 검토 완료되지 않은 것만, admin은 모두 가능
CREATE POLICY "usage_delete_own" ON usage_records FOR DELETE USING (
  (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    AND is_reviewed = FALSE
  )
  OR is_current_user_admin()
);

-- ============================================
-- audit_logs: admin만 읽기/쓰기
-- ============================================
CREATE POLICY "audit_admin" ON usage_record_audit_logs FOR ALL USING (is_current_user_admin());
```

---

## 3. Supabase Edge Functions / DB Functions

### 3-1. 활동비 자동 산정 함수

활동비 산정 공식을 DB Function으로 구현한다.

```sql
-- 활동비 산정 함수
-- base_amount: 본인 기준 금액 (본부장: 200,000 / 팀장: 150,000)
-- per_member_amount: 팀원 1인당 금액
-- additional_members: 추가 산정 인원 수 (예: P&C의 팀장 미만 26명)
-- additional_per_amount: 추가 인원 1인당 금액
CREATE OR REPLACE FUNCTION calculate_activity_budget(
  p_member_id UUID,
  p_base_amount INTEGER DEFAULT 150000,
  p_per_member_amount INTEGER DEFAULT 150000,
  p_additional_count INTEGER DEFAULT 0,
  p_additional_per_amount INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  v_team_count INTEGER;
  v_role member_role;
  v_result INTEGER;
BEGIN
  SELECT role INTO v_role FROM members WHERE id = p_member_id;

  IF v_role = '팀원' THEN
    RAISE EXCEPTION '팀원에게는 활동비를 할당할 수 없습니다.';
  END IF;

  -- 해당 멤버의 팀원 수 계산 (본인 제외)
  SELECT COUNT(*) INTO v_team_count
  FROM members
  WHERE team_id = (SELECT team_id FROM members WHERE id = p_member_id)
    AND id != p_member_id;

  v_result := p_base_amount + (p_per_member_amount * v_team_count)
            + (p_additional_per_amount * p_additional_count);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3-2. 검토 완료 토글 함수

```sql
CREATE OR REPLACE FUNCTION toggle_review_status(
  p_usage_record_id UUID,
  p_reviewer_id UUID
)
RETURNS usage_records AS $$
DECLARE
  v_record usage_records;
BEGIN
  -- admin 권한 확인
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION '검토 권한이 없습니다.';
  END IF;

  UPDATE usage_records
  SET
    is_reviewed = NOT is_reviewed,
    reviewed_by = CASE WHEN NOT is_reviewed THEN p_reviewer_id ELSE NULL END,
    reviewed_at = CASE WHEN NOT is_reviewed THEN now() ELSE NULL END
  WHERE id = p_usage_record_id
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3-3. 검토 완료 후 수정 시 audit log 기록 트리거

```sql
CREATE OR REPLACE FUNCTION log_reviewed_record_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 검토 완료된 레코드의 변경만 기록
  IF OLD.is_reviewed = TRUE THEN
    INSERT INTO usage_record_audit_logs (
      usage_record_id,
      action,
      changed_by,
      previous_data,
      new_data
    ) VALUES (
      OLD.id,
      TG_OP,
      (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1),
      to_jsonb(OLD),
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_usage_update
  BEFORE UPDATE ON usage_records
  FOR EACH ROW EXECUTE FUNCTION log_reviewed_record_change();

CREATE TRIGGER trg_audit_usage_delete
  BEFORE DELETE ON usage_records
  FOR EACH ROW EXECUTE FUNCTION log_reviewed_record_change();
```

### 3-4. 잔액 조회 뷰

```sql
CREATE OR REPLACE VIEW budget_summary AS
SELECT
  ba.id AS allocation_id,
  ba.member_id,
  m.name AS member_name,
  m.role,
  t.name AS team_name,
  d.name AS division_name,
  ba.type,
  ba.period,
  ba.total_amount,
  COALESCE(SUM(ur.amount), 0) AS used_amount,
  ba.total_amount - COALESCE(SUM(ur.amount), 0) AS remaining_amount,
  COUNT(ur.id) AS usage_count,
  COUNT(ur.id) FILTER (WHERE ur.is_reviewed = TRUE) AS reviewed_count
FROM budget_allocations ba
JOIN members m ON ba.member_id = m.id
LEFT JOIN teams t ON m.team_id = t.id
LEFT JOIN divisions d ON m.division_id = d.id
LEFT JOIN usage_records ur ON ur.allocation_id = ba.id
GROUP BY ba.id, ba.member_id, m.name, m.role, t.name, d.name, ba.type, ba.period, ba.total_amount;
```

---

## 4. Supabase Storage 설정 (영수증 이미지)

```sql
-- 영수증 업로드용 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', FALSE);

-- 같은 조직 멤버만 열람
CREATE POLICY "receipt_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts'
  AND auth.uid() IS NOT NULL
);

-- 본인만 업로드
CREATE POLICY "receipt_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid() IS NOT NULL
);

-- 본인만 삭제
CREATE POLICY "receipt_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'receipts'
  AND auth.uid() = owner
);
```

---

## 5. 프론트엔드 구현 요구사항

### 5-1. Admin 페이지

#### 조직 구성 관리 (`/admin/organization`)
- 조직 생성/수정/삭제
- 본부 생성/수정/삭제 (선택적 — 본부 없이 팀만 존재 가능)
- 팀 생성/수정/삭제
- 멤버 추가/수정/삭제 (이름, 역할, 소속 팀/본부 지정)
- 트리 형태 UI로 조직 > 본부 > 팀 > 멤버 구조를 시각적으로 표현

#### 예산 할당 관리 (`/admin/budget`)
- 기간(period) 선택 (월/분기/연 등)
- 테이블 형태로 모든 멤버 목록 표시:
  | No | 구분(역할) | 이름 | 팀원 수 | 활동비 산정 기준 | 활동비 | 복지포인트 |
- 활동비: 팀장/본부장만 행이 표시됨 (팀원은 활동비 열 비활성)
- 복지포인트: 모든 멤버에게 할당 가능
- 활동비 산정 기준을 직접 입력하거나, 자동 계산 버튼 제공
- 일괄 할당 기능 (동일 금액 일괄 적용)
- 개별 금액 수정 가능

#### 사용내역 검토 (`/admin/review`)
- 전체 사용내역 목록 (필터: 기간, 유형, 멤버, 검토 상태)
- 검토 완료 토글 버튼
- 검토 완료된 내역 수정/삭제 시:
  - 확인 모달 표시
  - 수정자, 수정일시 자동 기록
  - audit log에 변경 이력 저장
- 검토 상태별 시각적 구분 (배지 또는 배경색)

### 5-2. User 페이지

#### 복지포인트 사용 기록 (`/welfare`)
- 사용내역 입력 폼:
  - 금액 (숫자 입력, 천 단위 콤마 포맷)
  - 사용처 (텍스트)
  - 날짜 (DatePicker)
  - 동반결제 인원 (조직 내 멤버 다중 선택)
  - 영수증 이미지 업로드 (선택)
- 사용내역 목록:
  - 잔여 금액 상단에 크게 표시 (프로그레스 바 또는 원형 차트)
  - 최신순 정렬
  - 검토 완료 내역은 아이콘/배지/배경색으로 구분
  - 검토 완료 내역은 수정/삭제 버튼 숨김 + "검토 완료됨" 표시
  - 미검토 내역만 수정/삭제 가능

#### 활동비 사용 기록 (`/activity`)
- **팀장 이상만 접근 가능** (팀원은 해당 메뉴/탭 자체가 보이지 않음)
- 사용내역 입력 폼 (복지포인트와 동일 구조)
- 사용내역 목록 (복지포인트와 동일 구조)

#### 전체 내역 조회 (`/dashboard`)
- 조직 내 모든 인원의 활동비 및 복지포인트 내역을 열람 가능
- 필터: 유형(활동비/복지포인트), 기간, 멤버, 팀
- 요약 통계: 전체 예산 대비 사용률, 팀별 사용 현황 등
- 읽기 전용 (다른 사람의 내역은 수정/삭제 불가)

---

## 6. 비즈니스 규칙 요약

| 규칙 | 적용 위치 |
|------|-----------|
| 활동비는 팀장/본부장만 할당·작성 가능 | DB (RLS) + Frontend (UI 분기) |
| 복지포인트는 전 직원 할당·작성 가능 | DB + Frontend |
| 조직 내 모든 인원이 전체 내역 열람 가능 | DB (RLS SELECT 정책) |
| 검토 완료 내역은 일반 사용자 수정/삭제 불가 | DB (RLS UPDATE/DELETE 정책) + Frontend |
| 검토 완료 내역의 admin 수정/삭제 시 audit log 기록 | DB (트리거) |
| 팀원은 활동비 관련 UI가 노출되지 않음 | Frontend (role 기반 조건부 렌더링) |
| 본부가 없는 팀 구조 허용 | DB (division_id nullable) |

---

## 7. Supabase Client 사용 예시 (TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // supabase gen types로 생성

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 예산 요약 조회
const { data: budgetSummary } = await supabase
  .from('budget_summary')
  .select('*')
  .eq('period', '2025-Q1')
  .eq('type', '복지포인트');

// 사용내역 등록
const { data, error } = await supabase
  .from('usage_records')
  .insert({
    allocation_id: '...',
    member_id: currentMember.id,
    type: '복지포인트',
    amount: 50000,
    description: '점심 식사',
    used_at: '2025-02-06',
    companions: [memberId1, memberId2],
  });

// 검토 토글 (admin)
const { data: reviewed } = await supabase
  .rpc('toggle_review_status', {
    p_usage_record_id: recordId,
    p_reviewer_id: currentMember.id,
  });

// 조직 트리 조회
const { data: org } = await supabase
  .from('organizations')
  .select(`
    *,
    divisions (
      *,
      teams (
        *,
        members (*)
      )
    ),
    teams!teams_organization_id_fkey (
      *,
      members (*)
    )
  `)
  .single();
```

---

## 8. 추가 고려사항

- **Realtime**: 검토 완료 상태 변경 시 실시간 반영을 위해 Supabase Realtime 구독 고려
- **Type Safety**: `supabase gen types typescript`로 DB 타입 자동 생성
- **Soft Delete**: 사용내역 삭제 시 실제 삭제 대신 `deleted_at` 컬럼 추가를 고려할 수 있음
- **기간 관리**: period 필드를 별도 테이블로 분리하면 기간별 관리가 더 유연해짐
- **권한 관리**: 현재는 `is_admin` boolean이지만, 추후 세분화가 필요하면 별도 roles 테이블로 확장