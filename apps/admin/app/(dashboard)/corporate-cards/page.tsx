import { AdminCorporateCardsClient } from "@/components/operations/AdminCorporateCardsClient";
import { requireAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CorporateCardsPage() {
  await requireAdminPermission("corporate_card:read");
  return <AdminCorporateCardsClient />;
}
