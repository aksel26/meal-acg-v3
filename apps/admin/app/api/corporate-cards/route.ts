import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  assertSafeCorporateCardPayload,
  operationAmount,
  operationDate,
  operationPage,
  operationPageData,
  operationText,
} from "utils/company-operations";

const RECEIPT_BUCKET = "corporate-card-receipts";
const client = () => createServiceClient() as any;

function cardPayload(body: Record<string, unknown>) {
  assertSafeCorporateCardPayload(body);
  const status = operationText(body.status, "상태") || "active";
  if (!["active", "disabled", "archived"].includes(status)) {
    throw new Error("카드 상태를 확인해주세요.");
  }
  const monthlyLimitText = operationText(body.monthlyLimit, "월 한도");
  const monthlyLimit = monthlyLimitText ? Number(monthlyLimitText) : null;
  if (
    monthlyLimit != null &&
    (!Number.isFinite(monthlyLimit) || monthlyLimit < 0)
  ) {
    throw new Error("월 한도를 확인해주세요.");
  }
  return {
    name: operationText(body.name, "카드명", { required: true, max: 100 }),
    issuer: operationText(body.issuer, "카드사", { required: true, max: 100 }),
    last_four: operationText(body.lastFour, "카드 끝 4자리", {
      required: true,
      max: 4,
    }),
    assigned_member_id:
      operationText(body.assignedMemberId, "배정 직원") || null,
    assigned_team_id: operationText(body.assignedTeamId, "배정 팀") || null,
    status,
    monthly_limit: monthlyLimit,
    note: operationText(body.note, "메모", { max: 2000 }) || null,
  };
}

function transactionPayload(body: Record<string, unknown>) {
  return {
    card_id: operationText(body.cardId, "기업카드", { required: true }),
    member_id: operationText(body.memberId, "사용자", { required: true }),
    usage_date: operationDate(body.usageDate, "사용일"),
    merchant: operationText(body.merchant, "사용처", {
      required: true,
      max: 200,
    }),
    amount: operationAmount(body.amount, "금액"),
    category: operationText(body.category, "분류", {
      required: true,
      max: 100,
    }),
    business_purpose: operationText(body.businessPurpose, "사용 목적", {
      required: true,
      max: 1000,
    }),
    note: operationText(body.note, "메모", { max: 2000 }) || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission("corporate_card:read");
    const supabase = client();
    const receiptId = request.nextUrl.searchParams.get("receipt");
    if (receiptId) {
      const { data } = await supabase
        .from("corporate_card_transactions")
        .select("receipt_storage_path")
        .eq("id", receiptId)
        .maybeSingle();
      if (!data?.receipt_storage_path) {
        return NextResponse.json(
          { error: "영수증을 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      const { data: signed, error } = await supabase.storage
        .from(RECEIPT_BUCKET)
        .createSignedUrl(data.receipt_storage_path, 300);
      if (error || !signed?.signedUrl) throw error;
      await writeAdminAuditLog({
        session,
        request,
        action: "corporate_card.receipt.download",
        targetType: "corporate_card_transaction",
        targetId: receiptId,
        riskLevel: "high",
      });
      return NextResponse.redirect(signed.signedUrl);
    }
    const pagination = operationPage(request.nextUrl.searchParams);
    const [cards, transactions, members, teams] = await Promise.all([
      supabase
        .from("corporate_cards")
        .select(
          `
            *,
            assigned_member:members!corporate_cards_assigned_member_id_fkey(id, full_name),
            assigned_team:teams!corporate_cards_assigned_team_id_fkey(id, name)
          `,
        )
        .order("name"),
      supabase
        .from("corporate_card_transactions")
        .select(
          `
            *,
            member:members!corporate_card_transactions_member_id_fkey(id, full_name),
            card:corporate_cards!corporate_card_transactions_card_id_fkey(id, name, issuer, last_four)
          `,
        )
        .order("usage_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pagination.from, pagination.to),
      supabase
        .from("members")
        .select("id, full_name, team_id")
        .order("full_name"),
      supabase.from("teams").select("id, name").order("name"),
    ]);
    for (const result of [cards, transactions, members, teams]) {
      if (result.error) throw result.error;
    }
    const transactionPage = operationPageData(transactions.data, pagination);
    return NextResponse.json({
      cards: cards.data ?? [],
      transactions: transactionPage.items,
      members: members.data ?? [],
      teams: teams.data ?? [],
      pagination: transactionPage.pagination,
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      { error: "기업카드 관리 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("corporate_card:write");
    const body = (await request.json()) as Record<string, unknown>;
    const action = operationText(body.action, "작업", { required: true });
    const supabase = client();
    const target =
      action === "create_card"
        ? { table: "corporate_cards", payload: cardPayload(body) }
        : action === "create_transaction"
          ? {
              table: "corporate_card_transactions",
              payload: transactionPayload(body),
            }
          : null;
    if (!target) throw new Error("지원하지 않는 작업입니다.");
    if (action === "create_card") {
      const { error: safeError } = await supabase.rpc(
        "assert_safe_corporate_card_payload",
        { p_payload: body },
      );
      if (safeError) throw safeError;
    }
    const { data, error } = await supabase
      .from(target.table)
      .insert(target.payload)
      .select()
      .single();
    if (error) throw error;
    await writeAdminAuditLog({
      session,
      request,
      action: `corporate_card.${action}`,
      targetType:
        action === "create_card"
          ? "corporate_card"
          : "corporate_card_transaction",
      targetId: data.id,
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
            : "기업카드 정보를 등록하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminPermission("corporate_card:write");
    const body = (await request.json()) as Record<string, unknown>;
    const id = operationText(body.id, "대상", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    const supabase = client();
    let targetType: "corporate_card" | "corporate_card_transaction";

    if (action === "update_card") {
      const { error: safeError } = await supabase.rpc(
        "assert_safe_corporate_card_payload",
        { p_payload: body },
      );
      if (safeError) throw safeError;
      const { data, error } = await supabase
        .from("corporate_cards")
        .update(cardPayload(body))
        .eq("id", id)
        .neq("status", "archived")
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("수정 가능한 카드를 찾을 수 없습니다.");
      targetType = "corporate_card";
    } else if (action === "update_transaction") {
      const { data, error } = await supabase
        .from("corporate_card_transactions")
        .update(transactionPayload(body))
        .eq("id", id)
        .eq("status", "pending")
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("수정 가능한 대기 내역이 없습니다.");
      targetType = "corporate_card_transaction";
    } else if (
      action === "approve_transaction" ||
      action === "reject_transaction"
    ) {
      const isReject = action === "reject_transaction";
      const { data, error } = await supabase
        .from("corporate_card_transactions")
        .update({
          status: isReject ? "rejected" : "approved",
          rejection_reason: isReject
            ? operationText(body.reason, "반려 사유", {
                required: true,
                max: 2000,
              })
            : null,
          reviewed_by: session.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending")
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("이미 처리된 내역입니다.");
      targetType = "corporate_card_transaction";
    } else if (action === "archive_transaction") {
      const { data, error } = await supabase
        .from("corporate_card_transactions")
        .update({ status: "archived" })
        .eq("id", id)
        .in("status", ["approved", "rejected", "cancelled"])
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("보관 가능한 내역이 아닙니다.");
      targetType = "corporate_card_transaction";
    } else {
      throw new Error("지원하지 않는 작업입니다.");
    }

    await writeAdminAuditLog({
      session,
      request,
      action: `corporate_card.${action}`,
      targetType,
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "기업카드 정보를 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdminPermission("corporate_card:write");
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const type = request.nextUrl.searchParams.get("type");
    const supabase = client();
    if (type === "card") {
      const { count } = await supabase
        .from("corporate_card_transactions")
        .select("id", { count: "exact", head: true })
        .eq("card_id", id);
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          {
            error:
              "사용 이력이 있는 카드는 삭제할 수 없습니다. 보관 처리해주세요.",
          },
          { status: 409 },
        );
      }
      const { error } = await supabase
        .from("corporate_cards")
        .delete()
        .eq("id", id);
      if (error) throw error;
    } else if (type === "transaction") {
      const { data, error } = await supabase
        .from("corporate_card_transactions")
        .delete()
        .eq("id", id)
        .in("status", ["pending", "rejected", "cancelled"])
        .select("receipt_storage_path")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return NextResponse.json(
          { error: "승인·보관된 내역은 삭제할 수 없습니다." },
          { status: 409 },
        );
      }
      if (data.receipt_storage_path) {
        await supabase.storage
          .from(RECEIPT_BUCKET)
          .remove([data.receipt_storage_path]);
      }
    } else {
      throw new Error("삭제 대상을 확인해주세요.");
    }
    await writeAdminAuditLog({
      session,
      request,
      action: `corporate_card.${type}.delete`,
      targetType:
        type === "card" ? "corporate_card" : "corporate_card_transaction",
      targetId: id,
      riskLevel: "high",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    return NextResponse.json(
      { error: "기업카드 정보를 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
