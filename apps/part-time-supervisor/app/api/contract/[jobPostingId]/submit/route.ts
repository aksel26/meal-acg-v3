import { NextRequest, NextResponse } from "next/server";
import { encryptField } from "utils/hr-crypto";

import { createServiceClient } from "@/lib/supabase/server";
import {
  buildWorkerSessionLogoutCookie,
  getWorkerSession,
} from "@/lib/worker-session";

const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
const CONTRACT_MAX_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decodePngDataUrl(value: unknown, maxBytes: number): Buffer | null {
  if (typeof value !== "string") return null;
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  const base64 = match?.[1];
  if (!base64 || base64.length > Math.ceil(maxBytes / 3) * 4 + 4) return null;

  const buffer = Buffer.from(base64, "base64");
  if (
    buffer.length === 0 ||
    buffer.length > maxBytes ||
    !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    return null;
  }
  return buffer;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobPostingId: string }> },
) {
  try {
    const { jobPostingId } = await params;
    const session = await getWorkerSession(request, jobPostingId);
    if (!session) {
      return NextResponse.json(
        { error: "본인 확인이 만료되었습니다." },
        { status: 401 },
      );
    }

    const { signature_image, resident_id, contract_image } =
      await request.json();
    const residentId =
      typeof resident_id === "string" ? resident_id.replace(/\D/g, "") : "";
    const signatureBuffer = decodePngDataUrl(
      signature_image,
      SIGNATURE_MAX_BYTES,
    );
    const contractBuffer = decodePngDataUrl(contract_image, CONTRACT_MAX_BYTES);

    if (residentId.length !== 13 || !signatureBuffer || !contractBuffer) {
      return NextResponse.json(
        { error: "계약 정보 또는 이미지 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const encryptedResidentId = encryptField(residentId);
    const supabase = createServiceClient();
    const { data: assignment, error: checkError } = await supabase
      .from("assignments")
      .select("id, contract_status, attendance_status")
      .eq("id", session.assignmentId)
      .eq("worker_id", session.workerId)
      .eq("job_posting_id", jobPostingId)
      .single();

    if (checkError || !assignment) {
      return NextResponse.json(
        { error: "유효하지 않은 배정 정보입니다." },
        { status: 400 },
      );
    }
    if (assignment.contract_status !== null) {
      return NextResponse.json(
        { error: "이미 서명이 완료되었습니다." },
        { status: 409 },
      );
    }
    if (assignment.attendance_status !== "confirmed") {
      return NextResponse.json(
        { error: "출석 확인 후 계약서를 제출할 수 있습니다." },
        { status: 409 },
      );
    }

    const signaturePath = `signatures/${jobPostingId}/${session.workerId}.png`;
    const contractPath = `${session.workerId}/${jobPostingId}_contract.png`;
    const [{ error: signatureUploadError }, { error: contractUploadError }] =
      await Promise.all([
        supabase.storage.from("signatures").upload(signaturePath, signatureBuffer, {
          contentType: "image/png",
          upsert: true,
        }),
        supabase.storage.from("contracts").upload(contractPath, contractBuffer, {
          contentType: "image/png",
          upsert: true,
        }),
      ]);
    if (signatureUploadError) {
      throw signatureUploadError;
    }
    if (contractUploadError) {
      throw contractUploadError;
    }

    const { error: workerUpdateError } = await supabase
      .from("workers")
      .update({ resident_id: null, resident_id_enc: encryptedResidentId })
      .eq("id", session.workerId);
    if (workerUpdateError) {
      throw workerUpdateError;
    }

    const { data: updatedAssignment, error: updateError } = await supabase
      .from("assignments")
      .update({
        contract_status: "signed",
        signature_image_path: signaturePath,
        signed_at: new Date().toISOString(),
      })
      .eq("id", session.assignmentId)
      .eq("worker_id", session.workerId)
      .is("contract_status", null)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedAssignment) {
      return NextResponse.json(
        { error: "이미 서명이 완료되었습니다." },
        { status: 409 },
      );
    }

    const { error: documentError } = await supabase
      .from("contract_documents")
      .insert({
        worker_id: session.workerId,
        assignment_id: session.assignmentId,
        file_name: "표준근로계약서.png",
        file_path: contractPath,
        file_size: contractBuffer.length,
        mime_type: "image/png",
      });
    if (documentError) {
      console.error("Contract metadata insert failed:", documentError);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(buildWorkerSessionLogoutCookie());
    return response;
  } catch (error) {
    console.error("POST /api/contract/[jobPostingId]/submit error:", error);
    return NextResponse.json(
      { error: "서명 제출에 실패했습니다." },
      { status: 500 },
    );
  }
}
