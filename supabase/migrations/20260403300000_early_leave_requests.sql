-- 조기퇴근 요청 테이블 (가승인 → 최종승인 2단계 결재)
CREATE TABLE IF NOT EXISTS early_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id uuid NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reason text NOT NULL,
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'pre_approved', 'approved', 'rejected')),
  first_approver_id uuid REFERENCES members(id),
  first_approved_at timestamptz,
  final_approver_id uuid REFERENCES members(id),
  final_approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_early_leave_req_record ON early_leave_requests(attendance_record_id);
CREATE INDEX idx_early_leave_req_requester ON early_leave_requests(requester_id);
CREATE INDEX idx_early_leave_req_status ON early_leave_requests(approval_status);

COMMENT ON TABLE early_leave_requests IS '조기퇴근 요청 (가승인/최종승인 더블체크)';
COMMENT ON COLUMN early_leave_requests.approval_status IS 'pending=대기, pre_approved=가승인, approved=최종승인, rejected=반려';
