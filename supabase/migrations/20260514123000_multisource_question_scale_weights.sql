-- Per-scale weights for score-type multisource evaluation questions.

ALTER TABLE "public"."multisource_evaluation_question_set_items"
    ADD COLUMN IF NOT EXISTS "scale_weights" jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "public"."multisource_evaluation_questions"
    ADD COLUMN IF NOT EXISTS "scale_weights" jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE "public"."multisource_evaluation_question_set_items"
   SET scale_weights = (
       SELECT jsonb_object_agg(score::text, COALESCE(weight, 1))
         FROM generate_series(scale_min, scale_max) AS score
   )
 WHERE question_type = 'score'
   AND scale_weights = '{}'::jsonb;

UPDATE "public"."multisource_evaluation_questions"
   SET scale_weights = (
       SELECT jsonb_object_agg(score::text, COALESCE(weight, 1))
         FROM generate_series(1, 5) AS score
   )
 WHERE question_type = 'score'
   AND scale_weights = '{}'::jsonb;
