-- settlement_audit_logs: 정산 감사 로그 테이블 + 트리거

CREATE TABLE supervisor.settlement_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  action      text NOT NULL,  -- INSERT / UPDATE / DELETE
  old_data    jsonb,
  new_data    jsonb,
  changed_by  text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: service_role 전용
ALTER TABLE supervisor.settlement_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role only" ON supervisor.settlement_audit_logs
  USING (auth.role() = 'service_role');

-- 감사 로그 트리거 함수
CREATE OR REPLACE FUNCTION supervisor.log_settlement_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO supervisor.settlement_audit_logs (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO supervisor.settlement_audit_logs (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO supervisor.settlement_audit_logs (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NULL);
  END IF;
  RETURN NULL;
END;
$$;

-- work_records 트리거
CREATE TRIGGER trg_audit_work_records
  AFTER INSERT OR UPDATE OR DELETE ON supervisor.work_records
  FOR EACH ROW EXECUTE FUNCTION supervisor.log_settlement_change();

-- interview_work_records 트리거
CREATE TRIGGER trg_audit_interview_work_records
  AFTER INSERT OR UPDATE OR DELETE ON supervisor.interview_work_records
  FOR EACH ROW EXECUTE FUNCTION supervisor.log_settlement_change();

-- settlement_locks 트리거
CREATE TRIGGER trg_audit_settlement_locks
  AFTER INSERT OR DELETE ON supervisor.settlement_locks
  FOR EACH ROW EXECUTE FUNCTION supervisor.log_settlement_change();
