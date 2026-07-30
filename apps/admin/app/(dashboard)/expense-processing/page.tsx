import { ExpenseProcessingClient } from "@/components/expense-processing/ExpenseProcessingClient";
import { requireAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ExpenseProcessingPage() {
  await requireAdminPermission("expense_processing:read");
  return <ExpenseProcessingClient />;
}
