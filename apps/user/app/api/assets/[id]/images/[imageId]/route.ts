import { NextResponse } from "next/server";
import { canUpdateAsset, getAssetById, type AssetImageRecord } from "@/lib/assets";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { deleteAssetImage } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, imageId } = await context.params;
    const asset = await getAssetById(id);

    if (!asset) {
      return NextResponse.json({ error: "물품을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canUpdateAsset(session, asset)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const supabase = createWorkClient();
    const { data: images, error: imagesError } = await supabase
      .from("asset_images")
      .select("*")
      .eq("asset_id", id);

    if (imagesError) throw imagesError;

    const target = ((images ?? []) as AssetImageRecord[]).find(
      (image) => image.id === imageId,
    );
    if (!target) {
      return NextResponse.json({ error: "이미지를 찾을 수 없습니다." }, { status: 404 });
    }
    if (target.is_primary) {
      return NextResponse.json(
        {
          error:
            "대표 이미지는 삭제할 수 없습니다. 먼저 다른 이미지를 대표 이미지로 등록해주세요.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("asset_images").delete().eq("id", imageId);
    if (error) throw error;
    await deleteAssetImage(target.storage_path);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/assets/[id]/images/[imageId] error:", error);
    return NextResponse.json(
      { error: "이미지를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
