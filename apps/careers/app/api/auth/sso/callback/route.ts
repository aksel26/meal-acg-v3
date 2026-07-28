import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { resolveFreshAdmin, setSession } from "@/lib/auth";
import { createCareersServiceClient } from "@/lib/supabase/server";

function secure(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function getCareersOrigin() {
  const value = process.env.CAREERS_APP_URL;
  if (!value) return null;

  try {
    const url = new URL(value);
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

function authFailure(origin: URL) {
  return secure(NextResponse.redirect(new URL("/auth/error", origin)));
}

export async function GET(request: NextRequest) {
  const origin = getCareersOrigin();
  if (!origin) {
    return secure(
      NextResponse.json(
        { error: "채용 관리 서버 주소가 올바르게 설정되지 않았습니다." },
        { status: 500 },
      ),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code || !/^[A-Za-z0-9_-]{43}$/.test(code)) {
    return authFailure(origin);
  }

  try {
    const { data, error } = await createCareersServiceClient().rpc(
      "consume_sso_handoff",
      { p_code_hash: createHash("sha256").update(code).digest("hex") },
    );
    const handoff = Array.isArray(data) ? data[0] : null;
    if (error || !handoff?.admin_member_id || handoff.source_app !== "admin") {
      return authFailure(origin);
    }

    const admin = await resolveFreshAdmin({
      userId: handoff.admin_member_id,
    });
    if (!admin) return authFailure(origin);

    await setSession({
      userId: admin.id,
      fullName: admin.fullName,
      role: "admin",
    });
    return secure(NextResponse.redirect(new URL("/", origin)));
  } catch (error) {
    console.error("Careers SSO callback failed:", error);
    return authFailure(origin);
  }
}
