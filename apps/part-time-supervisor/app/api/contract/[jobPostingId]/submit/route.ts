import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobPostingId: string }> }
) {
  try {
    const { jobPostingId } = await params;
    const { assignment_id, worker_id, signature_image, resident_id, contract_image } = await request.json();

    if (!assignment_id || !worker_id || !signature_image) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. assignment 유효성 확인
    const { data: assignment, error: checkError } = await supabase
      .from("assignments")
      .select("id, contract_status")
      .eq("id", assignment_id)
      .eq("worker_id", worker_id)
      .eq("job_posting_id", jobPostingId)
      .single();

    if (checkError || !assignment) {
      return NextResponse.json({ error: "유효하지 않은 배정 정보입니다." }, { status: 400 });
    }

    if (assignment.contract_status !== null) {
      return NextResponse.json({ error: "이미 서명이 완료되었습니다." }, { status: 409 });
    }

    // 2. 서명 이미지 저장
    const base64Data = signature_image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = `signatures/${jobPostingId}/${worker_id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[submit] step 2 - signature upload failed:", uploadError);
      return NextResponse.json({ error: "서명 이미지 업로드에 실패했습니다." }, { status: 500 });
    }

    // 3. assignment 업데이트
    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        contract_status: "signed",
        signature_image_path: filePath,
        signed_at: new Date().toISOString(),
      })
      .eq("id", assignment_id);

    if (updateError) {
      console.error("[submit] step 3 - assignment update failed:", updateError);
      return NextResponse.json({ error: "계약 상태 업데이트에 실패했습니다." }, { status: 500 });
    }

    // 4. 주민등록번호 저장 (non-fatal: 마이그레이션 미적용 시에도 서명 제출은 성공)
    if (resident_id) {
      try {
        const { error: workerUpdateError } = await supabase
          .from("workers")
          .update({ resident_id })
          .eq("id", worker_id);

        if (workerUpdateError) {
          console.error("[submit] step 4 - resident_id update failed (non-fatal):", workerUpdateError);
        }
      } catch (e) {
        console.error("[submit] step 4 - resident_id exception (non-fatal):", e);
      }
    }

    // 5. 계약서 이미지 저장 (non-fatal)
    if (contract_image) {
      try {
        const contractBase64 = contract_image.replace(/^data:image\/\w+;base64,/, "");
        const contractBuffer = Buffer.from(contractBase64, "base64");
        const contractPath = `${worker_id}/${jobPostingId}_contract.png`;

        const { error: contractUploadError } = await supabase.storage
          .from("contracts")
          .upload(contractPath, contractBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (contractUploadError) {
          console.error("[submit] step 5 - contract image upload failed (non-fatal):", contractUploadError);
        } else {
          // contract_documents 레코드 삽입
          const { error: docInsertError } = await supabase
            .from("contract_documents")
            .insert({
              worker_id,
              assignment_id,
              file_name: "표준근로계약서.png",
              file_path: contractPath,
              file_size: contractBuffer.length,
              mime_type: "image/png",
            });

          if (docInsertError) {
            console.error("[submit] step 5 - contract_documents insert failed (non-fatal):", docInsertError);
          }
        }
      } catch (e) {
        console.error("[submit] step 5 - contract image exception (non-fatal):", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[submit] unexpected error:", error);
    return NextResponse.json({ error: "서명 제출에 실패했습니다." }, { status: 500 });
  }
}
