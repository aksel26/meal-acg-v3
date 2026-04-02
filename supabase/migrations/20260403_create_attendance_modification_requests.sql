CREATE TABLE IF NOT EXISTS attendance_modification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id uuid NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  original_type text NOT NULL,
  requested_type text NOT NULL,
  reason text NOT NULL,
  approval_status text NOT NULL DEFAULT '미승인',
  first_approver_id uuid REFERENCES members(id),
  first_approved_at timestamptz,
  final_approver_id uuid REFERENCES members(id),
  final_approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_mod_req_record ON attendance_modification_requests(attendance_record_id);
CREATE INDEX idx_attendance_mod_req_requester ON attendance_modification_requests(requester_id);
CREATE INDEX idx_attendance_mod_req_status ON attendance_modification_requests(approval_status);

COMMENT ON TABLE attendance_modification_requests IS '근태 유형 수정 요청 (P&C 더블체크 승인)';
