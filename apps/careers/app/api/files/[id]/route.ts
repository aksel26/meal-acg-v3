import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, route, throwIfError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, context: Context) => {
  await requireCareersAdmin();
  const { id } = await context.params;
  const supabase = createCareersServiceClient();
  const { data: file, error } = await supabase
    .from("applicant_files")
    .select(
      "bucket_id, object_path, original_filename, mime_type, size_bytes, applicant:applicants!inner(id)",
    )
    .eq("id", uuid(id))
    .is("applicant.deleted_at", null)
    .is("deleted_at", null)
    .maybeSingle();
  throwIfError(error);
  if (!file) throw new ApiError("파일을 찾을 수 없습니다.", 404);

  const { data: blob, error: downloadError } = await supabase.storage
    .from(file.bucket_id)
    .download(file.object_path);
  if (downloadError || !blob) {
    throw new ApiError("파일을 내려받지 못했습니다.", 500);
  }
  const asciiName = file.original_filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replaceAll('"', "_");
  return new Response(await blob.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.original_filename)}`,
      "Content-Length": String(file.size_bytes),
      "Content-Type": file.mime_type,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const DELETE = route(async (_request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const { data: file, error } = await createCareersServiceClient()
    .from("applicant_files")
    .update({ deleted_at: new Date().toISOString(), deleted_by: admin.id })
    .eq("id", uuid(id))
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  throwIfError(error);
  if (!file) throw new ApiError("파일을 찾을 수 없습니다.", 404);
  return data({ ok: true });
});
