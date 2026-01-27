import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/holidays - List holidays
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = searchParams.get("year");
    const month = searchParams.get("month");

    let query = supabase
      .from("holidays")
      .select("*")
      .order("holiday_date", { ascending: true });

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte("holiday_date", startDate).lte("holiday_date", endDate);
    }

    if (month && year) {
      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, "0")}-${lastDay}`;
      query = query.gte("holiday_date", startDate).lte("holiday_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching holidays:", error);
      return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Holidays API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/holidays - Create a new holiday
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { holidayDate, description } = body;

    if (!holidayDate || !description) {
      return NextResponse.json(
        { error: "holidayDate and description are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("holidays")
      .upsert(
        { holiday_date: holidayDate, description },
        { onConflict: "holiday_date" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error creating holiday:", error);
      return NextResponse.json({ error: "Failed to create holiday" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Holidays API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/holidays - Update a holiday
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { holidayDate, description } = body;

    if (!holidayDate || !description) {
      return NextResponse.json(
        { error: "holidayDate and description are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("holidays")
      .update({ description })
      .eq("holiday_date", holidayDate)
      .select()
      .single();

    if (error) {
      console.error("Error updating holiday:", error);
      return NextResponse.json({ error: "Failed to update holiday" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Holidays API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/holidays - Delete a holiday
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("holidays")
      .delete()
      .eq("holiday_date", date);

    if (error) {
      console.error("Error deleting holiday:", error);
      return NextResponse.json({ error: "Failed to delete holiday" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Holidays API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
