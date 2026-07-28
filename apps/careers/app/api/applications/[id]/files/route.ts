import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, route, throwIfError } from "@/lib/careers/http";
import {
  CAREERS_FILES_BUCKET,
  uploadApplicantFile,
  validateApplicantFileContent,
  validateApplicantFileMetadata,
} from "@/lib/careers/files";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, context: Context) => {
  await requireCareersAdmin();
  const { id } = await context.params;
  const applicationId = uuid(id);
  const supabase = createCareersServiceClient();
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, applicant:applicants!inner(id)")
    .eq("id", applicationId)
    .is("applicant.deleted_at", null)
    .maybeSingle();
  throwIfError(applicationError);
  if (!application) throw new ApiError("지원 건을 찾을 수 없습니다.", 404);

  const { data: files, error } = await supabase
    .from("applicant_files")
    .select("id, original_filename, mime_type, size_bytes, uploaded_at")
    .eq("application_id", applicationId)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  throwIfError(error);
  return data(
    (files ?? []).map((file) => ({
      id: file.id,
      originalName: file.original_filename,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      createdAt: file.uploaded_at,
    })),
  );
});

export const POST = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const applicationId = uuid(id);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError("파일이 필요합니다.", 400);
  }
  const { contentType, extension } = validateApplicantFileMetadata(file);

  const supabase = createCareersServiceClient();
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, applicant_id, applicant:applicants!inner(id)")
    .eq("id", applicationId)
    .is("applicant.deleted_at", null)
    .maybeSingle();
  throwIfError(applicationError);
  if (!application) throw new ApiError("지원 건을 찾을 수 없습니다.", 404);

  const bytes = new Uint8Array(await file.arrayBuffer());
  validateApplicantFileContent(extension, bytes);
  const objectPath = await uploadApplicantFile(
    applicationId,
    bytes,
    contentType,
  );
  const { data: record, error } = await supabase
    .from("applicant_files")
    .insert({
      applicant_id: application.applicant_id,
      application_id: applicationId,
      bucket_id: CAREERS_FILES_BUCKET,
      object_path: objectPath,
      original_filename: file.name,
      mime_type: contentType,
      size_bytes: file.size,
      uploaded_by: admin.id,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(CAREERS_FILES_BUCKET).remove([objectPath]);
    throw error;
  }
  return data(
    {
      id: record.id,
      originalName: record.original_filename,
      mimeType: record.mime_type,
      sizeBytes: record.size_bytes,
      createdAt: record.uploaded_at,
    },
    201,
  );
});
