import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { getSignedUrl, deleteFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("contract_documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const signedUrl = await getSignedUrl(data.file_path);
    return NextResponse.json({ ...data, signedUrl });
  } catch (error) {
    console.error("GET /api/contracts/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error: fetchError } = await supabase
      .from("contract_documents")
      .select("file_path")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteFile(data.file_path);

    const { error } = await supabase
      .from("contract_documents")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/contracts/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
  }
}
