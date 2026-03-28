-- Fix: settlement_locks, settlement_audit_logs 권한 부여
GRANT ALL ON supervisor.settlement_locks TO service_role;
GRANT ALL ON supervisor.settlement_audit_logs TO service_role;

-- Fix: interview_expense_reports에 year/month 컬럼 추가
ALTER TABLE supervisor.interview_expense_reports
  ADD COLUMN year int,
  ADD COLUMN month int;

-- job_posting_id를 optional로 변경 (월별 조회 지원)
ALTER TABLE supervisor.interview_expense_reports
  ALTER COLUMN job_posting_id DROP NOT NULL;
