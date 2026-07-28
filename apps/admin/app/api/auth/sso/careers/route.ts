import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { AuthError, requireAdmin } from "@/lib/auth";

function secure(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function getCareersOrigin() {
  try {
    const url = new URL(process.env.CAREERS_APP_URL || "http://localhost:3014");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.hash
    ) {
      return null;
    }
    return new URL(url.origin);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const origin = getCareersOrigin();
  if (!origin) {
    return secure(
      NextResponse.json(
        { error: "채용 관리 주소 설정이 올바르지 않습니다." },
        { status: 500 },
      ),
    );
  }
  const callback = new URL("/api/auth/sso/callback", origin);

  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return secure(NextResponse.redirect(new URL("/login", request.url)));
    }
    throw error;
  }

  const code = randomBytes(32).toString("base64url");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "careers" },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  await supabase
    .from("sso_handoffs")
    .delete()
    .lt("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { error } = await supabase.from("sso_handoffs").insert({
    code_hash: createHash("sha256").update(code).digest("hex"),
    admin_member_id: admin.userId,
    source_app: "admin",
  });
  if (error) {
    console.error("Admin to careers SSO handoff failed:", error);
    return secure(
      NextResponse.json(
        { error: "채용 관리 연결에 실패했습니다." },
        { status: 500 },
      ),
    );
  }

  callback.searchParams.set("code", code);
  return secure(NextResponse.redirect(callback));
}
