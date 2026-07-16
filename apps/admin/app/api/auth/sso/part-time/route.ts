import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { AuthError, requireAdmin } from "@/lib/auth";
import { createSupervisorServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    throw error;
  }
  const code = randomBytes(32).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const supabase = createSupervisorServiceClient();
  await supabase
    .from("sso_handoffs")
    .delete()
    .lt("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const { error } = await supabase.from("sso_handoffs").insert({
    code_hash: codeHash,
    member_id: user.userId,
    source_app: "admin",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  if (error) {
    console.error("Admin to supervisor SSO handoff failed:", error);
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
