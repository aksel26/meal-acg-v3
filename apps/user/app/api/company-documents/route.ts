import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
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

async function context() {
  const session = await getSessionUser();
  if (!session) return null;
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");
  return { session, supabase: supabase as any };
}

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

export async function GET(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = new URL(request.url).searchParams;
    const downloadId = params.get("download");
    if (downloadId) {
      const { data } = await ctx.supabase
        .from("company_documents")
        .select("submitted_by, status, storage_path")
        .eq("id", downloadId)
        .maybeSingle();
      if (
        !data ||
        (data.status !== "published" && data.submitted_by !== ctx.session.id)
      ) {
        return NextResponse.json(
          { error: "자료를 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      const { data: signed, error } = await ctx.supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(data.storage_path, 300);
      if (error || !signed?.signedUrl) throw error;
      return NextResponse.redirect(signed.signedUrl);
    }

    const category = params.get("category") ?? "";
    const q = operationSearch(params);
    const pagination = operationPage(params);
    let publishedQuery = ctx.supabase
      .from("company_documents")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (category) publishedQuery = publishedQuery.eq("category", category);
    if (q) {
      publishedQuery = publishedQuery.or(
        `title.ilike.%${q}%,description.ilike.%${q}%`,
      );
    }
    publishedQuery = publishedQuery
      .order("created_at", { ascending: false })
      .range(pagination.from, pagination.to);
    const [publishedResult, submissionsResult] = await Promise.all([
      publishedQuery,
      ctx.supabase
        .from("company_documents")
        .select("*")
        .eq("submitted_by", ctx.session.id)
        .order("created_at", { ascending: false })
        .range(pagination.from, pagination.to),
    ]);
    if (publishedResult.error) throw publishedResult.error;
    if (submissionsResult.error) throw submissionsResult.error;
    const publishedPage = operationPageData(publishedResult.data, pagination);
    const submissionPage = operationPageData(
      submissionsResult.data,
      pagination,
    );
    return NextResponse.json({
      published: publishedPage.items,
      submissions: submissionPage.items,
      pagination: {
        ...publishedPage.pagination,
        hasMore:
          publishedPage.pagination.hasMore || submissionPage.pagination.hasMore,
      },
    });
  } catch (error) {
    if (error instanceof OperationInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/company-documents error:", error);
    return NextResponse.json(
      { error: "전사 자료를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let storagePath: string | null = null;
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("자료 파일을 선택해주세요.");
    const validationError = await validateOperationFile(file, "document");
    if (validationError) throw new Error(validationError);
    const body = Object.fromEntries(formData.entries()) as Record<
      string,
      unknown
    >;
    storagePath = `${ctx.session.id}/${crypto.randomUUID()}.${safeStorageExtension(file.type)}`;
    const { error: uploadError } = await ctx.supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
      });
    if (uploadError) throw uploadError;

    const { data, error } = await ctx.supabase
      .from("company_documents")
      .insert({
        submitted_by: ctx.session.id,
        ...metadata(body),
        file_name: file.name,
        storage_path: storagePath,
        content_type: file.type,
        size_bytes: file.size,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (storagePath) {
      const supabase = createServiceClient();
      await supabase?.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "자료를 제출하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  let newStoragePath: string | null = null;
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isMultipart = request.headers
      .get("content-type")
      ?.includes("multipart/form-data");
    const formData = isMultipart ? await request.formData() : null;
    const body = formData
      ? (Object.fromEntries(formData.entries()) as Record<string, unknown>)
      : ((await request.json()) as Record<string, unknown>);
    const id = operationText(body.id, "자료", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    const { data: current } = await ctx.supabase
      .from("company_documents")
      .select("storage_path")
      .eq("id", id)
      .eq("submitted_by", ctx.session.id)
      .eq("status", "pending")
      .maybeSingle();
    if (!current) {
      return NextResponse.json(
        { error: "수정 가능한 대기 자료를 찾을 수 없습니다." },
        { status: 409 },
      );
    }

    let changes: Record<string, unknown>;
    if (action === "cancel") {
      changes = { status: "cancelled", reviewed_at: new Date().toISOString() };
    } else if (action === "update") {
      changes = metadata(body);
      const file = formData?.get("file");
      if (file instanceof File && file.size > 0) {
        const validationError = await validateOperationFile(file, "document");
        if (validationError) throw new Error(validationError);
        newStoragePath = `${ctx.session.id}/${crypto.randomUUID()}.${safeStorageExtension(file.type)}`;
        const { error } = await ctx.supabase.storage
          .from(DOCUMENT_BUCKET)
          .upload(newStoragePath, Buffer.from(await file.arrayBuffer()), {
            contentType: file.type,
          });
        if (error) throw error;
        changes = {
          ...changes,
          file_name: file.name,
          storage_path: newStoragePath,
          content_type: file.type,
          size_bytes: file.size,
        };
      }
    } else {
      throw new Error("지원하지 않는 작업입니다.");
    }
    const { data, error } = await ctx.supabase
      .from("company_documents")
      .update(changes)
      .eq("id", id)
      .eq("submitted_by", ctx.session.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      if (newStoragePath) {
        await ctx.supabase.storage
          .from(DOCUMENT_BUCKET)
          .remove([newStoragePath]);
        newStoragePath = null;
      }
      return NextResponse.json(
        { error: "수정 가능한 대기 자료를 찾을 수 없습니다." },
        { status: 409 },
      );
    }
    if (newStoragePath && current.storage_path !== newStoragePath) {
      await ctx.supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([current.storage_path]);
    }
    return NextResponse.json(data);
  } catch (error) {
    if (newStoragePath) {
      const supabase = createServiceClient();
      await supabase?.storage.from(DOCUMENT_BUCKET).remove([newStoragePath]);
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "자료를 변경하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
