import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { assertBookPayload } from "@/lib/library";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    await requireAdminPermission("library:write");
    const payload = assertBookPayload(await request.json());
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from("books")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      console.error("Book create error:", error);
      return NextResponse.json(
        { error: "도서를 추가하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
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
            : "도서 추가 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
