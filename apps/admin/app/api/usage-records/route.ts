import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// "2026-H1" → { start: "2026-01-01", end: "2026-06-30" }
// "2026-H2" → { start: "2026-07-01", end: "2026-12-31" }
function halfYearToDateRange(
  period: string,
): { start: string; end: string } | null {
  const match = period.match(/^(\d{4})-H([12])$/);
  if (!match) return null;
  const year = match[1];
  if (match[2] === "1") {
    return { start: `${year}-01-01`, end: `${year}-06-30` };
  }
  return { start: `${year}-07-01`, end: `${year}-12-31` };
}

function addOneDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseAmountList(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((amount) => Number(amount))
    .filter((amount) => Number.isFinite(amount));
}

function parseStringList(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// GET /api/usage-records - List usage records with filters
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const types = parseStringList(searchParams.get("types"));
    const memberId = searchParams.get("member_id");
    const memberIds = parseStringList(searchParams.get("member_ids"));
    const reviewStatus = searchParams.get("review_status");
    const reviewStatuses = parseStringList(searchParams.get("review_statuses"));
    const allocationId = searchParams.get("allocation_id");
    const descriptionSearch = searchParams.get("description_search")?.trim();
    const notesSearch = searchParams.get("notes_search")?.trim();
    const usedAtFrom = searchParams.get("used_at_from");
    const usedAtTo = searchParams.get("used_at_to");
    const createdAtFrom = searchParams.get("created_at_from");
    const createdAtTo = searchParams.get("created_at_to");
    const amounts = parseAmountList(searchParams.get("amounts"));

    let query = supabase
      .from("usage_records")
      .select(
        "*, members!usage_records_member_id_fkey(id, full_name), first_reviewer:members!usage_records_first_reviewed_by_fkey(full_name), second_reviewer:members!usage_records_second_reviewed_by_fkey(full_name)",
      );

    if (period) {
      const range = halfYearToDateRange(period);
      if (range) {
        query = query.gte("used_at", range.start).lte("used_at", range.end);
      } else {
        query = query.like("used_at", `${period}%`);
      }
    }
    if (types.length > 0) {
      query = query.in("type", types);
    } else if (type) {
      query = query.eq("type", type);
    }
    if (memberIds.length > 0) {
      query = query.in("member_id", memberIds);
    } else if (memberId) {
      query = query.eq("member_id", memberId);
    }
    if (descriptionSearch) {
      query = query.ilike("description", `%${descriptionSearch}%`);
    }
    if (notesSearch) {
      query = query.ilike("notes", `%${notesSearch}%`);
    }
    if (usedAtFrom) {
      query = query.gte("used_at", usedAtFrom);
    }
    if (usedAtTo) {
      query = query.lte("used_at", usedAtTo);
    }
    if (createdAtFrom) {
      query = query.gte("created_at", `${createdAtFrom}T00:00:00`);
    }
    if (createdAtTo) {
      query = query.lt("created_at", `${addOneDay(createdAtTo)}T00:00:00`);
    }
    if (amounts.length > 0) {
      query = query.in("amount", amounts);
    }
    if (reviewStatuses.length > 0) {
      const statusValues = reviewStatuses.flatMap((status) =>
        status === "in_progress" ? [1, 2] : [parseInt(status, 10)],
      );
      query = query.in(
        "review_status",
        Array.from(new Set(statusValues)).filter((status) =>
          Number.isFinite(status),
        ),
      );
    } else if (reviewStatus !== null && reviewStatus !== undefined) {
      if (reviewStatus === "in_progress") {
        query = query.in("review_status", [1, 2]);
      } else {
        query = query.eq("review_status", parseInt(reviewStatus, 10));
      }
    }
    if (allocationId) {
      query = query.eq("allocation_id", allocationId);
    }

    const { data, error } = await query
      .order("no", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching usage records:", error);
      return NextResponse.json(
        { error: "Failed to fetch usage records" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Usage records API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
