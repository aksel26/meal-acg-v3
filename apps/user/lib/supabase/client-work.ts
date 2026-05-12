import { createClient } from "@supabase/supabase-js";

/**
 * Service client scoped to the `work` schema (project_management 도메인).
 * Uses service role key — server-only.
 */
export function createWorkClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "work" },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Service client without default schema — caller specifies via `.schema()`.
 * Useful for queries that span schemas (e.g. masters: public + supervisor).
 */
export function createPublicWorkClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
