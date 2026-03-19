import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const { payRate, payType } = await request.json();

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("assignments")
      .update({
        pay_rate_override: payRate ?? null,
        pay_type_override: payType ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/assignments/[id]/pay-override error:", error);
    return NextResponse.json({ error: "Failed to update pay override" }, { status: 500 });
  }
}
