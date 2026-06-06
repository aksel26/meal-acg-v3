import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { apiError, logEvaluationAudit, resolveActorMemberId } from "../_utils";

// GET /api/evaluations/rounds - List evaluation rounds
export async function GET() {
  try {
    await requireAdminPermission("evaluation:read");
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("multisource_evaluation_rounds")
      .select(
        "*, question_set:multisource_evaluation_question_sets(id, name, is_active, is_default)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching evaluation rounds:", error);
      return apiError("Failed to fetch evaluation rounds", 500);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation rounds API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}

// POST /api/evaluations/rounds - Create an evaluation round
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("evaluation:write");
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return apiError("name, startDate, and endDate are required");
    }

    const { data, error } = await supabase
      .from("multisource_evaluation_rounds")
      .insert({
        name,
        description: description || null,
        start_date: startDate,
        end_date: endDate,
        created_by: actorId,
        updated_by: actorId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating evaluation round:", error);
      return apiError("Failed to create evaluation round", 500);
    }

    await logEvaluationAudit(supabase, {
      roundId: data.id,
      actorId,
      actorName: session.fullName,
      action: "CREATE_ROUND",
      targetTable: "multisource_evaluation_rounds",
      targetId: data.id,
      newData: data,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Evaluation rounds API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}
