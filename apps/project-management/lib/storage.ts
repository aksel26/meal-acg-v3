import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "request-attachments";
const PROJECT_BUCKET = "project-attachments";
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
  return uploadToBucket(BUCKET, requestId, fileBuffer, fileName, contentType);
}

export async function getAttachmentSignedUrl(
  path: string,
): Promise<string | null> {
  return getSignedUrlForBucket(BUCKET, path);
}

export async function deleteAttachment(path: string): Promise<boolean> {
  return deleteFromBucket(BUCKET, path);
}

export async function uploadProjectAttachment(
  projectId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadResult> {
  return uploadToBucket(
    PROJECT_BUCKET,
    projectId,
    fileBuffer,
    fileName,
    contentType,
  );
}

export async function getProjectAttachmentSignedUrl(
  path: string,
): Promise<string | null> {
  return getSignedUrlForBucket(PROJECT_BUCKET, path);
}

export async function deleteProjectAttachment(path: string): Promise<boolean> {
  return deleteFromBucket(PROJECT_BUCKET, path);
}

async function uploadToBucket(
  bucket: string,
  ownerId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadResult> {
  const supabase = createServiceClient();
  const ext = fileName.split(".").pop() || "bin";
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBuffer, { contentType });

  if (error) {
    return { path: "", error: error.message };
  }

  return { path, error: null };
}

async function getSignedUrlForBucket(
  bucket: string,
  path: string,
): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error(`getSignedUrl[${bucket}] error for "${path}":`, error.message);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error(`getSignedUrl[${bucket}] unexpected error for "${path}":`, error);
    return null;
  }
}

async function deleteFromBucket(bucket: string, path: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);

  return !error;
}
