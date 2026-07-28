ALTER TABLE careers.sso_handoffs
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '60 seconds');
