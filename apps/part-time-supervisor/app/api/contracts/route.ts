import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("worker_id");

    let query = supabase
      .from("contract_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (workerId) {
      query = query.eq("worker_id", workerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/contracts error:", error);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const supabase = createServiceClient();
    const formData = await request.formData();

    const file = formData.get("file") as File;
    const workerId = formData.get("worker_id") as string;
    const assignmentId = formData.get("assignment_id") as string | null;

    if (!file || !workerId) {
      return NextResponse.json({ error: "file과 worker_id는 필수입니다." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { path, error: uploadError } = await uploadFile(workerId, fileBuffer, file.name, file.type);
    if (uploadError) {
      return NextResponse.json({ error: uploadError }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("contract_documents")
      .insert({
        worker_id: workerId,
        assignment_id: assignmentId || null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: session.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/contracts error:", error);
    return NextResponse.json({ error: "Failed to upload contract" }, { status: 500 });
  }
}
