import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import {
  getAdminAuditRequestContext,
  writeAdminAuditLog,
} from "@/lib/admin-audit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  COMPANY_DOCUMENT_CATEGORIES,
  OperationInputError,
  operationPage,
  operationPageData,
  operationSearch,
  operationText,
  safeStorageExtension,
  validateOperationFile,
} from "utils/company-operations";

const DOCUMENT_BUCKET = "company-documents";
const client = () => createServiceClient() as any;

function metadata(body: Record<string, unknown>) {
  const category = operationText(body.category, "분류", { required: true });
  if (!COMPANY_DOCUMENT_CATEGORIES.includes(category as any)) {
    throw new Error("자료 분류를 확인해주세요.");
  }
  return {
    title: operationText(body.title, "제목", { required: true, max: 200 }),
    category,
    description: operationText(body.description, "설명", { max: 2000 }) || null,
    note: operationText(body.note, "메모", { max: 2000 }) || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission("company_documents:read");
    const supabase = client();
    const downloadId = request.nextUrl.searchParams.get("download");
    if (downloadId) {
      const { data } = await supabase
        .from("company_documents")
        .select("storage_path")
        .eq("id", downloadId)
        .maybeSingle();
      if (!data) {
        return NextResponse.json(
          { error: "자료를 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      const { data: signed, error } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(data.storage_path, 300);
      if (error || !signed?.signedUrl) throw error;
      await writeAdminAuditLog({
        session,
        request,
        action: "company_documents.download",
        targetType: "company_document",
        targetId: downloadId,
        riskLevel: "high",
      });
      return NextResponse.redirect(signed.signedUrl);
    }
    const params = request.nextUrl.searchParams;
    const pagination = operationPage(params);
    const status = operationText(params.get("status"), "상태", { max: 30 });
    const category = operationText(params.get("category"), "분류", {
      max: 30,
    });
    const q = operationSearch(params);
    let documentsQuery = supabase
      .from("company_documents")
      .select(
        "*, submitter:members!company_documents_submitted_by_fkey(id, full_name)",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (status) documentsQuery = documentsQuery.eq("status", status);
    if (category) documentsQuery = documentsQuery.eq("category", category);
    if (q) {
      documentsQuery = documentsQuery.or(
        `title.ilike.%${q}%,description.ilike.%${q}%`,
      );
    }
    const [documents, members] = await Promise.all([
      documentsQuery.range(pagination.from, pagination.to),
      supabase.from("members").select("id, full_name").order("full_name"),
    ]);
    if (documents.error) throw documents.error;
    if (members.error) throw members.error;
    const documentPage = operationPageData(documents.data, pagination);
    return NextResponse.json({
      documents: documentPage.items,
      members: members.data ?? [],
      pagination: documentPage.pagination,
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    if (error instanceof OperationInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "전사 자료를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let storagePath: string | null = null;
  try {
    const session = await requireAdminPermission("company_documents:write");
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("자료 파일을 선택해주세요.");
    const validationError = await validateOperationFile(file, "document");
    if (validationError) throw new Error(validationError);
    const body = Object.fromEntries(formData.entries()) as Record<
      string,
      unknown
    >;
    const documentMetadata = metadata(body);
    const submittedBy =
      operationText(body.submittedBy, "제출자") || session.userId;
    storagePath = `${submittedBy}/${crypto.randomUUID()}.${safeStorageExtension(file.type)}`;
    const supabase = client();
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
      });
    if (uploadError) throw uploadError;
    const publish = body.publish === "true";
    const auditContext = getAdminAuditRequestContext(request);
    const { data, error } = await supabase.rpc("mutate_company_document_file", {
      p_operation: publish ? "publish_upload" : "upload",
      p_payload: {
        submitted_by: submittedBy,
        ...documentMetadata,
        file_name: file.name,
        storage_path: storagePath,
        content_type: file.type,
        size_bytes: file.size,
      },
      p_actor_id: session.userId,
      p_request_path: auditContext.requestPath,
      p_ip_address: auditContext.ipAddress,
      p_user_agent: auditContext.userAgent,
    });
    if (error) throw error;
    storagePath = null;
    return NextResponse.json(data.document, { status: 201 });
  } catch (error) {
    if (storagePath) {
      await client().storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    }
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "전사 자료를 등록하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminPermission("company_documents:write");
    const body = (await request.json()) as Record<string, unknown>;
    const id = operationText(body.id, "자료", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    const supabase = client();
    let changes: Record<string, unknown>;
    let statuses: string[];
    if (action === "update") {
      changes = metadata(body);
      statuses = ["pending", "published", "rejected"];
    } else {
      const now = new Date().toISOString();
      if (action === "publish") {
        changes = {
          status: "published",
          rejection_reason: null,
          reviewed_by: session.userId,
          reviewed_at: now,
          published_at: now,
        };
        statuses = ["pending", "rejected"];
      } else if (action === "reject") {
        changes = {
          status: "rejected",
          rejection_reason: operationText(body.reason, "반려 사유", {
            required: true,
            max: 2000,
          }),
          reviewed_by: session.userId,
          reviewed_at: now,
        };
        statuses = ["pending"];
      } else if (action === "archive") {
        changes = { status: "archived" };
        statuses = ["published", "rejected", "cancelled"];
      } else {
        throw new Error("지원하지 않는 작업입니다.");
      }
    }
    const { data, error } = await supabase
      .from("company_documents")
      .update(changes)
      .eq("id", id)
      .in("status", statuses)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("처리 가능한 자료를 찾을 수 없습니다.");
    await writeAdminAuditLog({
      session,
      request,
      action: `company_documents.${action}`,
      targetType: "company_document",
      targetId: id,
    });
    return NextResponse.json(data);
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "전사 자료를 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest) {
  let newPath: string | null = null;
  try {
    const session = await requireAdminPermission("company_documents:write");
    const formData = await request.formData();
    const id = operationText(formData.get("id"), "자료", { required: true });
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("교체 파일을 선택해주세요.");
    const validationError = await validateOperationFile(file, "document");
    if (validationError) throw new Error(validationError);
    const supabase = client();
    const { data: current } = await supabase
      .from("company_documents")
      .select("submitted_by")
      .eq("id", id)
      .maybeSingle();
    if (!current) throw new Error("자료를 찾을 수 없습니다.");
    newPath = `${current.submitted_by}/${crypto.randomUUID()}.${safeStorageExtension(file.type)}`;
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(newPath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
      });
    if (uploadError) throw uploadError;
    const auditContext = getAdminAuditRequestContext(request);
    const { data, error } = await supabase.rpc("mutate_company_document_file", {
      p_operation: "replace",
      p_payload: {
        id,
        file_name: file.name,
        storage_path: newPath,
        content_type: file.type,
        size_bytes: file.size,
      },
      p_actor_id: session.userId,
      p_request_path: auditContext.requestPath,
      p_ip_address: auditContext.ipAddress,
      p_user_agent: auditContext.userAgent,
    });
    if (error) throw error;
    newPath = null;
    const oldStoragePath = data?.oldStoragePath;
    if (oldStoragePath) {
      const { error: cleanupError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([oldStoragePath]);
      if (cleanupError) {
        console.error("Old company document cleanup failed:", cleanupError);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (newPath) {
      await client().storage.from(DOCUMENT_BUCKET).remove([newPath]);
    }
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "파일을 교체하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdminPermission("company_documents:write");
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const supabase = client();
    const { data, error } = await supabase
      .from("company_documents")
      .delete()
      .eq("id", id)
      .in("status", ["pending", "rejected", "cancelled"])
      .select("storage_path")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "게시·보관된 자료는 삭제할 수 없습니다." },
        { status: 409 },
      );
    }
    await supabase.storage.from(DOCUMENT_BUCKET).remove([data.storage_path]);
    await writeAdminAuditLog({
      session,
      request,
      action: "company_documents.delete",
      targetType: "company_document",
      targetId: id,
      riskLevel: "high",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      { error: "자료를 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
