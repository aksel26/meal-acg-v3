import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { assertBookPayload } from "@/lib/library";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("library:write");
    const { id } = await params;
    const payload = assertBookPayload(await request.json());
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from("books")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Book update error:", error);
      return NextResponse.json(
        { error: "도서를 수정하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "도서 수정 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("library:write");
    const { id } = await params;
    const supabase = createServiceClient() as any;
    const { data: rentals } = await supabase
      .from("book_rentals")
      .select("id")
      .eq("book_id", id)
      .limit(1);

    if (rentals?.length) {
      return NextResponse.json(
        {
          error:
            "대여 이력이 있는 도서는 삭제할 수 없습니다. 대여중지로 변경해주세요.",
        },
        { status: 409 },
      );
    }

    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) {
      console.error("Book delete error:", error);
      return NextResponse.json(
        { error: "도서를 삭제하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      { error: "도서 삭제 중 오류가 발생했습니다." },
      { status: 400 },
    );
  }
}
