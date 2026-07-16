import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { resolveFreshSession, setSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

function loginRedirect(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login?sso=failed", request.url),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !/^[A-Za-z0-9_-]{43}$/.test(code)) {
    return loginRedirect(request);
  }

  try {
    const codeHash = createHash("sha256").update(code).digest("hex");
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("consume_sso_handoff", {
      p_code_hash: codeHash,
    });
    const handoff = Array.isArray(data) ? data[0] : null;
    if (error || !handoff?.member_id) {
      return loginRedirect(request);
    }

    const user = await resolveFreshSession({ userId: handoff.member_id });
    if (!user || (handoff.source_app === "admin" && user.role !== "admin")) {
      return loginRedirect(request);
    }

    await setSession({
      userId: user.id,
      fullName: user.fullName,
      role: user.role,
      canEdit: user.canEdit,
    });
    const response = NextResponse.redirect(new URL("/", request.url));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    console.error("Part-time supervisor SSO callback failed:", error);
    return loginRedirect(request);
  }
}
