import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  AssetPayloadValidationError,
  canUpdateAsset,
  getAssetById,
  parseAssetPayload,
} from "@/lib/assets";
import { createWorkClient } from "@/lib/supabase/client-work";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const asset = await getAssetById(id);

    if (!asset) {
      return NextResponse.json({ error: "물품을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canUpdateAsset(session, asset)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const payload = parseAssetPayload(body);
    const supabase = createWorkClient();
    const { data, error } = await supabase
      .from("assets")
      .update({
        name: payload.name,
        category: payload.category,
        status: payload.status,
        purchase_date: payload.purchaseDate,
        purchase_amount: payload.purchaseAmount,
        user_id: payload.userId,
        user_name: payload.userName,
        manager_id: payload.managerId,
        manager_name: payload.managerName,
        asset_number: payload.assetNumber,
        serial_number: payload.serialNumber,
        location: payload.location,
        memo: payload.memo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/assets/[id] error:", error);
    if (error instanceof AssetPayloadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "물품을 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}
