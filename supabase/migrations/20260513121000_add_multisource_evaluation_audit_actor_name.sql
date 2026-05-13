ALTER TABLE "public"."multisource_evaluation_audit_logs"
  ADD COLUMN IF NOT EXISTS "actor_name" text;
