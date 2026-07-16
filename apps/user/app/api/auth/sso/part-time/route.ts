import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  const code = randomBytes(32).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "supervisor" },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  await supabase
    .from("sso_handoffs")
    .delete()
    .lt("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const { error } = await supabase.from("sso_handoffs").insert({
    code_hash: codeHash,
    member_id: user.id,
    source_app: "user",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  if (error) {
    console.error("User to supervisor SSO handoff failed:", error);
    return NextResponse.json(
      { error: "SSO 연결에 실패했습니다." },
      { status: 500 },
    );
  }

  const target =
    process.env.SUPERVISOR_APP_URL ||
    process.env.NEXT_PUBLIC_SUPERVISOR_APP_URL ||
    "http://localhost:3002";
  const callback = new URL("/api/auth/sso/callback", target);
  if (process.env.NODE_ENV === "production" && callback.protocol !== "https:") {
    return NextResponse.json(
      { error: "SSO 주소 설정이 올바르지 않습니다." },
      { status: 500 },
    );
  }
  callback.searchParams.set("code", code);
  const response = NextResponse.redirect(callback);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
