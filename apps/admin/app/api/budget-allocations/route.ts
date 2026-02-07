import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/budget-allocations - List budget allocations
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const memberId = searchParams.get("member_id");

    let query = supabase
      .from("budget_allocations")
      .select(
        "*, members!budget_allocations_member_id_fkey(id, full_name, member_role, team_id)"
      );

    if (period) {
      query = query.eq("period", period);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (memberId) {
      query = query.eq("member_id", memberId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching budget allocations:", error);
      return NextResponse.json(
        { error: "Failed to fetch budget allocations" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Budget allocations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/budget-allocations - Create a single allocation
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { member_id, type, period, total_amount, description } = body;

    if (!member_id || !type || !period || total_amount === undefined) {
      return NextResponse.json(
        {
          error:
            "member_id, type, period, and total_amount are required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("budget_allocations")
      .insert({
        member_id,
        type,
        period,
        total_amount,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating budget allocation:", error);
      return NextResponse.json(
        { error: "Failed to create budget allocation" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Budget allocations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/budget-allocations - Bulk upsert allocations
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { allocations } = body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: "allocations array is required and must not be empty" },
        { status: 400 }
      );
    }

    const results = [];

    for (const allocation of allocations) {
      const { member_id, type, period, total_amount, description } = allocation;

      if (!member_id || !type || !period || total_amount === undefined) {
        continue;
      }

      // Try to find existing allocation by member_id + type + period
      const { data: existing } = await supabase
        .from("budget_allocations")
        .select("id")
        .eq("member_id", member_id)
        .eq("type", type)
        .eq("period", period)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("budget_allocations")
          .update({
            total_amount,
            description: description || null,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating allocation:", error);
        } else {
          results.push(data);
        }
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("budget_allocations")
          .insert({
            member_id,
            type,
            period,
            total_amount,
            description: description || null,
          })
          .select()
          .single();

        if (error) {
          console.error("Error inserting allocation:", error);
        } else {
          results.push(data);
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Budget allocations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
