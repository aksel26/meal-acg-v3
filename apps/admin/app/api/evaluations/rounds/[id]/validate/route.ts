import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, validateRound } from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/evaluations/rounds/[id]/validate - Validate round before confirm/deploy
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const result = await validateRound(supabase, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Evaluation round validation API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}
