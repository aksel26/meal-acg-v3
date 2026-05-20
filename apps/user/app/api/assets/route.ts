import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import {
  AssetPayloadValidationError,
  listAssetsForUser,
  parseAssetPayload,
} from "@/lib/assets";
import {
  deleteAssetImage,
  uploadAssetImage,
  validateImageAttachment,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await requireAuth();
    const assets = await listAssetsForUser(session);

    return NextResponse.json(assets, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json(
      { error: "물품 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let createdAssetId: string | null = null;
  let uploadedPath: string | null = null;

  try {
    const session = await requireAuth();
    const formData = await request.formData();
    const payload = parseAssetPayload(formData);
    const primaryImage = formData.get("primaryImage");

    if (!(primaryImage instanceof File)) {
      return NextResponse.json(
        { error: "대표 이미지는 필수입니다." },
        { status: 400 },
      );
    }

    const validationError = await validateImageAttachment(primaryImage);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = createWorkClient();
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
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
        created_by: session.id,
        created_by_name: session.fullName,
      })
      .select()
      .single();

    if (assetError) throw assetError;
    createdAssetId = asset.id;

    const fileBuffer = Buffer.from(await primaryImage.arrayBuffer());
    const { path, error: uploadError } = await uploadAssetImage(
      asset.id,
      fileBuffer,
      primaryImage.name,
      primaryImage.type || "application/octet-stream",
    );

    if (uploadError) throw new Error(uploadError);
    uploadedPath = path;

    const { error: imageError } = await supabase.from("asset_images").insert({
      asset_id: asset.id,
      storage_path: path,
      file_name: primaryImage.name,
      content_type: primaryImage.type || null,
      size_bytes: primaryImage.size,
      is_primary: true,
      uploaded_by: session.id,
      uploaded_by_name: session.fullName,
    });

    if (imageError) throw imageError;

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (uploadedPath) await deleteAssetImage(uploadedPath);
    if (createdAssetId) {
      await createWorkClient().from("assets").delete().eq("id", createdAssetId);
    }

    console.error("POST /api/assets error:", error);
    if (error instanceof AssetPayloadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "물품을 등록하지 못했습니다." },
      { status: 500 },
    );
  }
}
