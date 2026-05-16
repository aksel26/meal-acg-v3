import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  logEvaluationAudit,
  resolveActorMemberId,
  validateRound,
} from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/evaluations/rounds/[id]/deploy - Toggle deployment state
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;
    const body = await request.json();
    const isDeployed = Boolean(body.isDeployed);

    const { data: oldData, error: oldError } = await supabase
      .from("multisource_evaluation_rounds")
      .select("*")
      .eq("id", id)
      .single();

    if (oldError || !oldData) {
      return apiError("Round not found", 404);
    }

    if (isDeployed) {
      const validation = await validateRound(supabase, id);
      if (!validation.valid) {
        return NextResponse.json(validation, { status: 422 });
      }
    }

    const { data, error } = await supabase
      .from("multisource_evaluation_rounds")
      .update({
        is_deployed: isDeployed,
        deployed_at: isDeployed ? new Date().toISOString() : null,
        deployed_by: isDeployed ? actorId : null,
        updated_by: actorId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling evaluation round deployment:", error);
      return apiError("Failed to toggle evaluation round deployment", 500);
    }

    await logEvaluationAudit(supabase, {
      roundId: id,
      actorId,
      actorName: session.fullName,
      action: isDeployed ? "DEPLOY_ROUND" : "UNDEPLOY_ROUND",
      targetTable: "multisource_evaluation_rounds",
      targetId: id,
      oldData,
      newData: data,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation round deploy API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}
