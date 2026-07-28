import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  OperationInputError,
  assertOperationDateRange,
  operationDate,
  operationPage,
  operationPageData,
  operationSearch,
  operationText,
} from "utils/company-operations";

const client = () => createServiceClient() as any;

function parkingPayload(body: Record<string, unknown>) {
  const startDate = operationDate(body.requestedStartDate, "시작일");
  const endDate = operationDate(body.requestedEndDate, "종료일", false);
  assertOperationDateRange(startDate, endDate);
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
    requested_start_date: startDate,
    requested_end_date: endDate,
    note: operationText(body.note, "메모", { max: 2000 }) || null,
    admin_note:
      operationText(body.adminNote, "관리자 메모", { max: 2000 }) || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("parking:read");
    const supabase = client();
    const params = request.nextUrl.searchParams;
    const pagination = operationPage(params);
    const status = operationText(params.get("status"), "상태", { max: 30 });
    const member = operationSearch(params, "member");
    let registrationsQuery = supabase
      .from("parking_registrations")
      .select(
        "*, member:members!parking_registrations_member_id_fkey!inner(id, full_name)",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (status) registrationsQuery = registrationsQuery.eq("status", status);
    if (member) {
      registrationsQuery = registrationsQuery.ilike(
        "member.full_name",
        `%${member}%`,
      );
    }
    const [registrations, members] = await Promise.all([
      registrationsQuery.range(pagination.from, pagination.to),
      supabase.from("members").select("id, full_name").order("full_name"),
    ]);
    if (registrations.error) throw registrations.error;
    if (members.error) throw members.error;
    const registrationPage = operationPageData(registrations.data, pagination);
    return NextResponse.json({
      registrations: registrationPage.items,
      members: members.data ?? [],
      pagination: registrationPage.pagination,
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    if (error instanceof OperationInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "주차 등록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("parking:write");
    const body = (await request.json()) as Record<string, unknown>;
    const { data, error } = await client()
      .from("parking_registrations")
      .insert({
        member_id: operationText(body.memberId, "직원", { required: true }),
        ...parkingPayload(body),
      })
      .select()
      .single();
    if (error) throw error;
    await writeAdminAuditLog({
      session,
      request,
      action: "parking.create",
      targetType: "parking_registration",
      targetId: data.id,
      targetLabel: data.vehicle_plate,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "주차 등록을 추가하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminPermission("parking:write");
    const body = (await request.json()) as Record<string, unknown>;
    const id = operationText(body.id, "등록", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    const supabase = client();
    let changes: Record<string, unknown>;
    let expectedStatuses: string[];

    if (action === "update") {
      changes = parkingPayload(body);
      expectedStatuses = [
        "pending",
        "approved",
        "rejected",
        "expired",
        "cancelled",
      ];
    } else {
      const nextStatus: Record<string, string> = {
        approve: "approved",
        reject: "rejected",
        expire: "expired",
        cancel: "cancelled",
        archive: "archived",
      };
      const status = nextStatus[action];
      if (!status) throw new Error("지원하지 않는 작업입니다.");
      changes = {
        status,
        rejection_reason:
          action === "reject"
            ? operationText(body.reason, "반려 사유", {
                required: true,
                max: 2000,
              })
            : null,
        admin_note:
          operationText(body.adminNote, "관리자 메모", { max: 2000 }) || null,
        processed_by: session.userId,
        processed_at: new Date().toISOString(),
      };
      expectedStatuses =
        action === "approve" || action === "reject"
          ? ["pending"]
          : action === "expire"
            ? ["approved"]
            : action === "cancel"
              ? ["pending", "approved"]
              : ["approved", "rejected", "expired", "cancelled"];
    }

    const { data, error } = await supabase
      .from("parking_registrations")
      .update(changes)
      .eq("id", id)
      .in("status", expectedStatuses)
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === "23P01") {
        throw new Error("같은 차량번호로 겹치는 승인 등록이 있습니다.");
      }
      throw error;
    }
    if (!data) throw new Error("처리 가능한 등록을 찾을 수 없습니다.");
    await writeAdminAuditLog({
      session,
      request,
      action: `parking.${action}`,
      targetType: "parking_registration",
      targetId: id,
    });
    return NextResponse.json(data);
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "주차 등록을 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdminPermission("parking:write");
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const { data, error } = await client()
      .from("parking_registrations")
      .delete()
      .eq("id", id)
      .in("status", ["pending", "rejected", "cancelled"])
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "승인·만료·보관된 등록은 삭제할 수 없습니다." },
        { status: 409 },
      );
    }
    await writeAdminAuditLog({
      session,
      request,
      action: "parking.delete",
      targetType: "parking_registration",
      targetId: id,
      riskLevel: "high",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      { error: "주차 등록을 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
