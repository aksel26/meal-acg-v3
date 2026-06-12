import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listLibraryForUser } from "@/lib/library";

export async function GET() {
  const session = await requireAuth();
  return NextResponse.json(await listLibraryForUser(session));
}
