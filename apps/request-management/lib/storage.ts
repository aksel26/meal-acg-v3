import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "request-attachments";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export type UploadResult = {
  path: string;
  error: string | null;
};

export function validateAttachment(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "첨부파일은 20MB 이하만 업로드할 수 있습니다.";
  }

  return null;
}

export async function uploadAttachment(
  requestId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadResult> {
  const supabase = createServiceClient();
  const ext = fileName.split(".").pop() || "bin";
  const path = `${requestId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, { contentType });

  if (error) {
    return { path: "", error: error.message };
  }

  return { path, error: null };
}

export async function getAttachmentSignedUrl(
  path: string,
): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error(`getAttachmentSignedUrl error for "${path}":`, error.message);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error(`getAttachmentSignedUrl unexpected error for "${path}":`, error);
    return null;
  }
}

export async function deleteAttachment(path: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  return !error;
}
