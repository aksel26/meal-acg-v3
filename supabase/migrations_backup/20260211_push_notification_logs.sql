CREATE TABLE push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT,
  send_to_all BOOLEAN DEFAULT false,
  total_recipients INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  cleaned_count INT DEFAULT 0,
  results JSONB,
  sent_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny direct access" ON push_notification_logs FOR ALL USING (false);
