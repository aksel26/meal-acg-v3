import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import {
  operationDate,
  operationPage,
  operationPageData,
  operationParkingTicket,
  operationParkingUsageType,
  operationText,
} from "utils/company-operations";

async function context() {
  const session = await getSessionUser();
  if (!session) return null;
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");
  return { session, supabase: supabase as any };
}

function parkingPayload(body: Record<string, unknown>) {
  const requestedDate = operationDate(
    body.requestedDate ?? body.requestedStartDate,
    "주차 일자",
  );
  const ticket = operationParkingTicket(body.ticketCode ?? "two_hours");
  const usageType = operationParkingUsageType(body.usageType ?? "business");
  return {
    vehicle_plate: operationText(body.vehiclePlate, "차량번호", {
      required: true,
      max: 30,
    }),
    vehicle_name: operationText(body.vehicleName, "차량명", {
      required: true,
      max: 100,
    }),
    vehicle_type: operationText(body.vehicleType, "차종", {
      required: true,
      max: 50,
    }),
    requested_start_date: requestedDate,
    requested_end_date: requestedDate,
    ticket_code: ticket.code,
    usage_type: usageType,
    note: operationText(body.note, "메모", { max: 2000 }) || null,
  };
}

export async function GET(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const pagination = operationPage(new URL(request.url).searchParams);
    const { data, error } = await ctx.supabase
      .from("parking_registrations")
      .select("*")
      .eq("member_id", ctx.session.id)
      .order("created_at", { ascending: false })
      .range(pagination.from, pagination.to);
    if (error) throw error;
    const registrationPage = operationPageData(data, pagination);
    return NextResponse.json({
      registrations: registrationPage.items,
      pagination: registrationPage.pagination,
    });
  } catch (error) {
    console.error("GET /api/parking error:", error);
    return NextResponse.json(
      { error: "주차 등록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const { data, error } = await ctx.supabase
      .from("parking_registrations")
      .insert({ member_id: ctx.session.id, ...parkingPayload(body) })
      .select()
      .single();
    if (error) {
      if (error.code === "23505" || error.code === "23P01") {
        return NextResponse.json(
          { error: "같은 차량번호로 겹치는 등록이 있습니다." },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "주차 등록을 신청하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const id = operationText(body.id, "등록", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    const changes =
      action === "cancel"
        ? { status: "cancelled", processed_at: new Date().toISOString() }
        : action === "update"
          ? parkingPayload(body)
          : null;
    if (!changes) throw new Error("지원하지 않는 작업입니다.");

    const { data, error } = await ctx.supabase
      .from("parking_registrations")
      .update(changes)
      .eq("id", id)
      .eq("member_id", ctx.session.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "수정 가능한 대기 등록을 찾을 수 없습니다." },
        { status: 409 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "주차 등록을 변경하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
