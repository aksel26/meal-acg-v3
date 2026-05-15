-- User-submitted multisource evaluation responses.
-- Keep response snapshots reportable even if round questions change later.

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_responses" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "round_id" uuid NOT NULL,
    "assignment_id" uuid NOT NULL,
    "subject_member_id" uuid NOT NULL,
    "evaluator_member_id" uuid NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_responses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_responses_assignment_key" UNIQUE ("assignment_id"),
    CONSTRAINT "multisource_evaluation_responses_round_assignment_fkey"
        FOREIGN KEY ("assignment_id") REFERENCES "public"."multisource_evaluation_assignments"("id") ON DELETE RESTRICT,
    CONSTRAINT "multisource_evaluation_responses_round_fkey"
        FOREIGN KEY ("round_id") REFERENCES "public"."multisource_evaluation_rounds"("id") ON DELETE RESTRICT,
    CONSTRAINT "multisource_evaluation_responses_subject_fkey"
        FOREIGN KEY ("subject_member_id") REFERENCES "public"."members"("id") ON DELETE RESTRICT,
    CONSTRAINT "multisource_evaluation_responses_evaluator_fkey"
        FOREIGN KEY ("evaluator_member_id") REFERENCES "public"."members"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_response_answers" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "response_id" uuid NOT NULL,
    "question_id" uuid,
    "question_prompt" text NOT NULL,
    "question_type" "public"."multisource_evaluation_question_type" NOT NULL,
    "score_value" integer,
    "scale_weight" numeric(8, 2),
    "text_answer" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_response_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_response_answers_response_question_key"
        UNIQUE ("response_id", "question_id"),
    CONSTRAINT "multisource_evaluation_response_answers_response_fkey"
        FOREIGN KEY ("response_id") REFERENCES "public"."multisource_evaluation_responses"("id") ON DELETE CASCADE,
    CONSTRAINT "multisource_evaluation_response_answers_question_fkey"
        FOREIGN KEY ("question_id") REFERENCES "public"."multisource_evaluation_questions"("id") ON DELETE SET NULL,
    CONSTRAINT "multisource_evaluation_response_answers_score_check" CHECK (
        ("question_type" = 'score' AND "score_value" IS NOT NULL AND "text_answer" IS NULL)
        OR ("question_type" = 'subjective' AND "score_value" IS NULL AND "text_answer" IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_responses_round"
    ON "public"."multisource_evaluation_responses" ("round_id", "submitted_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_responses_evaluator"
    ON "public"."multisource_evaluation_responses" ("evaluator_member_id", "round_id");

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_responses_subject"
    ON "public"."multisource_evaluation_responses" ("subject_member_id", "round_id");

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_response_answers_response"
    ON "public"."multisource_evaluation_response_answers" ("response_id");
