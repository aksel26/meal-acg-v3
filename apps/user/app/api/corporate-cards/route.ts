import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import {
  operationAmount,
  operationDate,
  operationPage,
  operationPageData,
  operationText,
  safeStorageExtension,
  validateOperationFile,
} from "utils/company-operations";

const RECEIPT_BUCKET = "corporate-card-receipts";

async function context() {
  const session = await getSessionUser();
  if (!session) return null;
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");
  return { session, supabase: supabase as any };
}

async function accessibleCardIds(
  ctx: NonNullable<Awaited<ReturnType<typeof context>>>,
) {
  const { data: member } = await ctx.supabase
    .from("members")
    .select("team_id")
    .eq("id", ctx.session.id)
    .single();
  let query = ctx.supabase
    .from("corporate_cards")
    .select("*")
    .neq("status", "archived");
  query = member?.team_id
    ? query.or(
        `assigned_member_id.eq.${ctx.session.id},assigned_team_id.eq.${member.team_id}`,
      )
    : query.eq("assigned_member_id", ctx.session.id);
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data ?? [];
}

function transactionPayload(body: Record<string, unknown>) {
  return {
    card_id: operationText(body.cardId, "기업카드", { required: true }),
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

export async function GET(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const receiptId = new URL(request.url).searchParams.get("receipt");
    if (receiptId) {
      const { data } = await ctx.supabase
        .from("corporate_card_transactions")
        .select("receipt_storage_path")
        .eq("id", receiptId)
        .eq("member_id", ctx.session.id)
        .maybeSingle();
      if (!data?.receipt_storage_path) {
        return NextResponse.json(
          { error: "영수증을 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      const { data: signed, error } = await ctx.supabase.storage
        .from(RECEIPT_BUCKET)
        .createSignedUrl(data.receipt_storage_path, 300);
      if (error || !signed?.signedUrl) throw error;
      return NextResponse.redirect(signed.signedUrl);
    }

    const pagination = operationPage(new URL(request.url).searchParams);
    const cards = await accessibleCardIds(ctx);
    const { data: transactions, error } = await ctx.supabase
      .from("corporate_card_transactions")
      .select(
        `
          *,
          card:corporate_cards(id, name, issuer, last_four)
        `,
      )
      .eq("member_id", ctx.session.id)
      .order("usage_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(pagination.from, pagination.to);
    if (error) throw error;
    const transactionPage = operationPageData(transactions, pagination);
    return NextResponse.json({
      cards,
      transactions: transactionPage.items,
      pagination: transactionPage.pagination,
    });
  } catch (error) {
    console.error("GET /api/corporate-cards error:", error);
    return NextResponse.json(
      { error: "기업카드 내역을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries()) as Record<
      string,
      unknown
    >;
    const payload = transactionPayload(body);
    const cards = await accessibleCardIds(ctx);
    if (
      !cards.some(
        (card: any) => card.id === payload.card_id && card.status === "active",
      )
    ) {
      return NextResponse.json(
        { error: "배정된 기업카드만 등록할 수 있습니다." },
        { status: 403 },
      );
    }

    const receipt = formData.get("receipt");
    let receiptFields = {};
    if (receipt instanceof File && receipt.size > 0) {
      const validationError = await validateOperationFile(receipt, "receipt");
      if (validationError) throw new Error(validationError);
      uploadedPath = `${ctx.session.id}/${crypto.randomUUID()}.${safeStorageExtension(receipt.type)}`;
      const { error } = await ctx.supabase.storage
        .from(RECEIPT_BUCKET)
        .upload(uploadedPath, Buffer.from(await receipt.arrayBuffer()), {
          contentType: receipt.type,
        });
      if (error) throw error;
      receiptFields = {
        receipt_storage_path: uploadedPath,
        receipt_file_name: receipt.name,
        receipt_content_type: receipt.type,
        receipt_size_bytes: receipt.size,
      };
    }

    const { data, error } = await ctx.supabase
      .from("corporate_card_transactions")
      .insert({
        ...payload,
        member_id: ctx.session.id,
        ...receiptFields,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      const supabase = createServiceClient();
      await supabase?.storage.from(RECEIPT_BUCKET).remove([uploadedPath]);
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "기업카드 내역을 등록하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  let newReceiptPath: string | null = null;
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isMultipart = request.headers
      .get("content-type")
      ?.includes("multipart/form-data");
    const formData = isMultipart ? await request.formData() : null;
    const body = formData
      ? (Object.fromEntries(formData.entries()) as Record<string, unknown>)
      : ((await request.json()) as Record<string, unknown>);
    const id = operationText(body.id, "내역", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    let changes: Record<string, unknown>;
    if (action === "cancel") {
      changes = { status: "cancelled", reviewed_at: new Date().toISOString() };
    } else if (action === "update") {
      changes = transactionPayload(body);
      const cards = await accessibleCardIds(ctx);
      if (
        !cards.some(
          (card: any) =>
            card.id === changes.card_id && card.status === "active",
        )
      ) {
        return NextResponse.json(
          { error: "배정된 기업카드만 등록할 수 있습니다." },
          { status: 403 },
        );
      }
      const receipt = formData?.get("receipt");
      if (receipt instanceof File && receipt.size > 0) {
        const validationError = await validateOperationFile(receipt, "receipt");
        if (validationError) throw new Error(validationError);
        newReceiptPath = `${ctx.session.id}/${crypto.randomUUID()}.${safeStorageExtension(receipt.type)}`;
        const { error } = await ctx.supabase.storage
          .from(RECEIPT_BUCKET)
          .upload(newReceiptPath, Buffer.from(await receipt.arrayBuffer()), {
            contentType: receipt.type,
          });
        if (error) throw error;
        changes = {
          ...changes,
          receipt_storage_path: newReceiptPath,
          receipt_file_name: receipt.name,
          receipt_content_type: receipt.type,
          receipt_size_bytes: receipt.size,
        };
      }
    } else {
      throw new Error("지원하지 않는 작업입니다.");
    }

    const { data: current } = await ctx.supabase
      .from("corporate_card_transactions")
      .select("receipt_storage_path")
      .eq("id", id)
      .eq("member_id", ctx.session.id)
      .eq("status", "pending")
      .maybeSingle();
    const { data, error } = await ctx.supabase
      .from("corporate_card_transactions")
      .update(changes)
      .eq("id", id)
      .eq("member_id", ctx.session.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      if (newReceiptPath) {
        await ctx.supabase.storage
          .from(RECEIPT_BUCKET)
          .remove([newReceiptPath]);
        newReceiptPath = null;
      }
      return NextResponse.json(
        { error: "수정 가능한 대기 내역을 찾을 수 없습니다." },
        { status: 409 },
      );
    }
    if (
      newReceiptPath &&
      current?.receipt_storage_path &&
      current.receipt_storage_path !== newReceiptPath
    ) {
      await ctx.supabase.storage
        .from(RECEIPT_BUCKET)
        .remove([current.receipt_storage_path]);
    }
    return NextResponse.json(data);
  } catch (error) {
    if (newReceiptPath) {
      const supabase = createServiceClient();
      await supabase?.storage.from(RECEIPT_BUCKET).remove([newReceiptPath]);
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "기업카드 내역을 변경하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
