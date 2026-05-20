import { NextResponse } from "next/server";
import { getAuthErrorStatus } from "@/lib/auth";

export function authErrorResponse(error: unknown) {
  const authStatus = getAuthErrorStatus(error);
  if (authStatus) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
  }
  return null;
}

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function nullableText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

export function nullableId(value: unknown) {
  const text = normalizeText(value);
  return text && text !== "none" ? text : null;
}

export function toInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", ""));
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  }
  return 0;
}

export function calculateAmounts(quantity: unknown, unitPrice: unknown) {
  const normalizedQuantity = Math.max(Number(quantity) || 1, 0.01);
  const normalizedUnitPrice = toInteger(unitPrice);
  const supplyAmount = Math.round(normalizedQuantity * normalizedUnitPrice);
  const taxAmount = Math.round(supplyAmount * 0.1);
  return {
    quantity: normalizedQuantity,
    unit_price: normalizedUnitPrice,
    supply_amount: supplyAmount,
    tax_amount: taxAmount,
    total_amount: supplyAmount + taxAmount,
  };
}

export async function syncQuoteTotals(supabase: any, quoteId: string) {
  const { data: items, error } = await supabase
    .from("finance_quote_items")
    .select("supply_amount, tax_amount, total_amount")
    .eq("quote_id", quoteId);

  if (error) throw error;

  const totals = (items || []).reduce(
    (
      acc: { subtotal_amount: number; tax_amount: number; total_amount: number },
      item: { supply_amount: number | null; tax_amount: number | null; total_amount: number | null },
    ) => ({
      subtotal_amount: acc.subtotal_amount + (item.supply_amount || 0),
      tax_amount: acc.tax_amount + (item.tax_amount || 0),
      total_amount: acc.total_amount + (item.total_amount || 0),
    }),
    { subtotal_amount: 0, tax_amount: 0, total_amount: 0 },
  );

  const { error: updateError } = await supabase
    .from("finance_quotes")
    .update(totals)
    .eq("id", quoteId);

  if (updateError) throw updateError;

  return totals;
}
