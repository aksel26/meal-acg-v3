import { createServiceClient } from "./supabase/server";

const BUCKET = "contracts";

export async function uploadFile(
  workerId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ path: string; error: string | null }> {
  const supabase = createServiceClient();
  const ext = fileName.split(".").pop();
  const path = `${workerId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, { contentType });

  if (error) {
    return { path: "", error: error.message };
  }

  return { path, error: null };
}

export async function getSignedUrl(path: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error(`getSignedUrl error for path "${path}":`, error.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error(`getSignedUrl unexpected error for path "${path}":`, err);
    return null;
  }
}

export async function deleteFile(path: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  return !error;
}
