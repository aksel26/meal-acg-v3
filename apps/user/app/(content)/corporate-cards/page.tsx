import { UserCorporateCardsClient } from "@/components/operations/UserCorporateCardsClient";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CorporateCardsPage() {
  await requireAuth();
  return <UserCorporateCardsClient />;
}
