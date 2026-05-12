import { NextResponse } from "next/server";
import { buildLogoutCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(buildLogoutCookie());
  response.cookies.delete("user-session"); // legacy cleanup
  return response;
}
