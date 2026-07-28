import "server-only";

import { createClient } from "@supabase/supabase-js";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase server environment variables are not configured.",
    );
  }

  return { url, key };
}

function createServiceClient(schema?: string) {
  const { url, key } = getSupabaseConfig();

  return createClient(url, key, {
    ...(schema ? { db: { schema } } : {}),
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createCareersServiceClient() {
  return createServiceClient("careers");
}

export function createPublicServiceClient() {
  return createServiceClient();
}
