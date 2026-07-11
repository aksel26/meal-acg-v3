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

    const { data: currentStatus, error: statusError } = await supabase
      .from("member_current_status")
      .select("current_status")
      .eq("member_id", member_id)
      .maybeSingle();

    if (statusError) {
      console.error("Error checking member status:", statusError);
      return NextResponse.json(
        { error: "Failed to check member status" },
        { status: 500 }
      );
    }

    if (currentStatus?.current_status === "퇴사") {
      return NextResponse.json(
        { error: "퇴사자는 예산 할당 대상이 아닙니다." },
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

    const { data: resignedMembers, error: resignedError } = await supabase
      .from("member_current_status")
      .select("member_id")
      .eq("current_status", "퇴사");

    if (resignedError) {
      console.error("Error fetching resigned members:", resignedError);
      return NextResponse.json(
        { error: "Failed to fetch resigned members" },
        { status: 500 }
      );
    }

    const resignedMemberIds = new Set(
      (resignedMembers || [])
        .map((member) => member.member_id)
        .filter((id): id is string => Boolean(id))
    );

    // (member_id|type|period) 복합키
    const allocationKey = (a: {
      member_id: string;
      type: string;
      period: string;
    }) => `${a.member_id}|${a.type}|${a.period}`;

    // 유효 항목 필터 + 입력 내 중복 복합키 제거 (last-wins).
    // budget_allocations에 unique 제약이 없어 중복 입력 시 중복 행이 생기는 것을 방지한다.
    const validAllocations = [
      ...new Map(
        allocations
          .filter(
            ({ member_id, type, period, total_amount }) =>
              member_id &&
              type &&
              period &&
              total_amount !== undefined &&
              !resignedMemberIds.has(member_id)
          )
          .map((a) => [allocationKey(a), a]),
      ).values(),
    ];

    if (validAllocations.length === 0) {
      return NextResponse.json([]);
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("budget_allocations")
      .select("id, member_id, type, period")
      .in("member_id", [...new Set(validAllocations.map((a) => a.member_id))])
      .in("type", [...new Set(validAllocations.map((a) => a.type))])
      .in("period", [...new Set(validAllocations.map((a) => a.period))]);

    if (existingError) {
      console.error("Error fetching existing allocations:", existingError);
      return NextResponse.json(
        { error: "Failed to fetch existing allocations" },
        { status: 500 }
      );
    }

    const existingIdByKey = new Map(
      (existingRows || []).map((row) => [allocationKey(row), row.id])
    );

    const toInsert = validAllocations.filter(
      (a) => !existingIdByKey.has(allocationKey(a))
    );
    const toUpdate = validAllocations.filter((a) =>
      existingIdByKey.has(allocationKey(a))
    );

    const results = [];

    if (toInsert.length > 0) {
      const { data, error } = await supabase
        .from("budget_allocations")
        .insert(
          toInsert.map(({ member_id, type, period, total_amount, description }) => ({
            member_id,
            type,
            period,
            total_amount,
            description: description || null,
          }))
        )
        .select();

      if (error) {
        console.error("Error inserting allocations:", error);
      } else {
        results.push(...(data || []));
      }
    }

    const updated = await Promise.all(
      toUpdate.map(async (a) => {
        const { data, error } = await supabase
          .from("budget_allocations")
          .update({
            total_amount: a.total_amount,
            description: a.description || null,
          })
          .eq("id", existingIdByKey.get(allocationKey(a))!)
          .select()
          .single();

        if (error) {
          console.error("Error updating allocation:", error);
          return null;
        }
        return data;
      })
    );
    results.push(...updated.filter((row) => row !== null));

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
