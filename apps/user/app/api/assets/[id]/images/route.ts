import { NextResponse } from "next/server";
import { canUpdateAsset, getAssetById, type AssetImageRecord } from "@/lib/assets";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import {
  deleteAssetImage,
  uploadAssetImage,
  validateImageAttachment,
} from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  let uploadedPath: string | null = null;
  let insertedImageId: string | null = null;

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

    const formData = await request.formData();
    const file = formData.get("file");
    const isPrimary = formData.get("isPrimary") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "이미지는 필수입니다." }, { status: 400 });
    }

    const validationError = await validateImageAttachment(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { path, error: uploadError } = await uploadAssetImage(
      id,
      fileBuffer,
      file.name,
      file.type || "application/octet-stream",
    );

    if (uploadError) throw new Error(uploadError);
    uploadedPath = path;

    const supabase = createWorkClient();

    const { data, error } = await supabase
      .from("asset_images")
      .insert({
        asset_id: id,
        storage_path: path,
        file_name: file.name,
        content_type: file.type || null,
        size_bytes: file.size,
        is_primary: false,
        uploaded_by: session.id,
        uploaded_by_name: session.fullName,
      })
      .select()
      .single();

    if (error) throw error;
    insertedImageId = data.id;

    if (isPrimary) {
      const { data: currentPrimary, error: primaryError } = await supabase
        .from("asset_images")
        .select("*")
        .eq("asset_id", id)
        .eq("is_primary", true)
        .maybeSingle();
      if (primaryError) throw primaryError;

      const { error: resetError } = await supabase
        .from("asset_images")
        .update({ is_primary: false })
        .eq("asset_id", id);
      if (resetError) throw resetError;

      const { error: promoteError } = await supabase
        .from("asset_images")
        .update({ is_primary: true })
        .eq("id", data.id);

      if (promoteError) {
        const previousPrimary = currentPrimary as AssetImageRecord | null;
        if (previousPrimary) {
          await supabase
            .from("asset_images")
            .update({ is_primary: true })
            .eq("id", previousPrimary.id);
        }
        throw promoteError;
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (insertedImageId) {
      await createWorkClient().from("asset_images").delete().eq("id", insertedImageId);
    }
    if (uploadedPath) await deleteAssetImage(uploadedPath);
    console.error("POST /api/assets/[id]/images error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다." },
      { status: 500 },
    );
  }
}
