import { createServiceClient } from "@/lib/supabase/client";

const BUCKET = "request-attachments";
const PROJECT_BUCKET = "project-attachments";
const ASSET_BUCKET = "asset-images";
const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
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

export async function validateImageAttachment(
  file: File,
): Promise<string | null> {
  const sizeError = validateAttachment(file);
  if (sizeError) return sizeError;
  if (!ALLOWED_IMAGE_CONTENT_TYPES.has(file.type)) {
    return "이미지 파일만 업로드할 수 있습니다.";
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesAllowedImageSignature(file.type, header)) {
    return "이미지 파일만 업로드할 수 있습니다.";
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

export async function uploadProjectFeedAttachment(
  projectId: string,
  feedId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadResult> {
  return uploadToBucket(
    PROJECT_BUCKET,
    `${projectId}/feed/${feedId}`,
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

export async function uploadAssetImage(
  assetId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadResult> {
  return uploadToBucket(
    ASSET_BUCKET,
    assetId,
    fileBuffer,
    fileName,
    contentType,
  );
}

export async function getAssetImageSignedUrl(
  path: string,
): Promise<string | null> {
  return getSignedUrlForBucket(ASSET_BUCKET, path);
}

export async function deleteAssetImage(path: string): Promise<boolean> {
  return deleteFromBucket(ASSET_BUCKET, path);
}

function matchesAllowedImageSignature(
  contentType: string,
  header: Uint8Array,
): boolean {
  switch (contentType) {
    case "image/jpeg":
      return matchesHeader(header, [0xff, 0xd8, 0xff]);
    case "image/png":
      return matchesHeader(header, [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ]);
    case "image/gif":
      return (
        matchesHeader(header, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
        matchesHeader(header, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
      );
    case "image/webp":
      return (
        matchesHeader(header, [0x52, 0x49, 0x46, 0x46], 0) &&
        matchesHeader(header, [0x57, 0x45, 0x42, 0x50], 8)
      );
    default:
      return false;
  }
}

function matchesHeader(
  header: Uint8Array,
  signature: number[],
  offset = 0,
): boolean {
  if (header.length < offset + signature.length) {
    return false;
  }

  return signature.every((byte, index) => header[offset + index] === byte);
}

async function uploadToBucket(
  bucket: string,
  ownerId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadResult> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { path: "", error: "Supabase env not configured" };
  }
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
    if (!supabase) return null;
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
  if (!supabase) return false;
  const { error } = await supabase.storage.from(bucket).remove([path]);

  return !error;
}
