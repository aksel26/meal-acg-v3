import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listVehiclesForUser } from "@/lib/vehicles";

export async function GET(request: Request) {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);
  return NextResponse.json(
    await listVehiclesForUser(session, searchParams.get("date") || undefined),
  );
}
