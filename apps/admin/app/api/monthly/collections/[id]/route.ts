import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/monthly/collections/[id] - 취합 건 상세 + 신청 내역
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    // 취합 건 조회
    const { data: collection, error: collectionError } = await supabase
      .from("drink_collections")
      .select("*")
      .eq("id", id)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // 전체 멤버 조회
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name")
      .order("full_name");

    // 해당 취합 건의 신청 내역 조회
    const { data: applications } = await supabase
      .from("monthly_drink_applications")
      .select("*")
      .eq("collection_id", id);

    // 멤버별 신청 내역 매핑
    const applicationMap = new Map(
      applications?.map((app) => [app.user_id, app]) || []
    );

    const allApplications =
      members?.map((member) => {
        const app = applicationMap.get(member.id);
        return {
          id: app?.id || `pending-${member.id}`,
          userId: member.id,
          name: member.full_name,
          drink: app?.drink || "",
          memo: app?.memo || "",
        };
      }) || [];

    return NextResponse.json({
      success: true,
      data: {
        collection,
        applications: allApplications,
        drinkOptions: (collection.drink_options as string[]) || [],
        pickupPersons: (collection.pickup_persons as string[]) || [],
        totalMembers: members?.length || 0,
      },
    });
  } catch (error) {
    console.error("Collection detail API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/monthly/collections/[id] - 취합 건 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const body = await request.json();
    const {
      title,
      is_active,
      is_one_time,
      year,
      month,
      drink_options,
      pickup_persons,
    } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_one_time !== undefined) updateData.is_one_time = is_one_time;
    if (year !== undefined) updateData.year = year;
    if (month !== undefined) updateData.month = month;
    if (drink_options !== undefined) updateData.drink_options = drink_options;
    if (pickup_persons !== undefined)
      updateData.pickup_persons = pickup_persons;

    const { error } = await supabase
      .from("drink_collections")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating collection:", error);
      return NextResponse.json(
        { error: "Failed to update collection" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "취합 건이 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("Collection update API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/monthly/collections/[id] - 취합 건 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    // 연결된 신청 내역 먼저 삭제
    await supabase
      .from("monthly_drink_applications")
      .delete()
      .eq("collection_id", id);

    // 취합 건 삭제
    const { error } = await supabase
      .from("drink_collections")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting collection:", error);
      return NextResponse.json(
        { error: "Failed to delete collection" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "취합 건이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Collection delete API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
