import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertRoundEditable,
  logEvaluationAudit,
  resolveActorMemberId,
  validateRound,
} from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

// POST /api/evaluations/rounds/[id]/confirm - Confirm/lock a non-deployed round
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;

    await assertRoundEditable(supabase, id);

    const validation = await validateRound(supabase, id);
    if (!validation.valid) {
      return NextResponse.json(validation, { status: 422 });
    }

    const { data: oldData } = await supabase
      .from("multisource_evaluation_rounds")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("multisource_evaluation_rounds")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: actorId,
        updated_by: actorId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error confirming evaluation round:", error);
      return apiError("Failed to confirm evaluation round", 500);
    }

    await logEvaluationAudit(supabase, {
      roundId: id,
      actorId,
      actorName: session.fullName,
      action: "CONFIRM_ROUND",
      targetTable: "multisource_evaluation_rounds",
      targetId: id,
      oldData,
      newData: data,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation round confirm API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    if (error instanceof Error && error.message === "Round not found") {
      return apiError("Round not found", 404);
    }
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }
    return apiError("Internal server error", 500);
  }
}
