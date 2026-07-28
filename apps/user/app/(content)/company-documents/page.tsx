import { UserCompanyDocumentsClient } from "@/components/operations/UserCompanyDocumentsClient";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CompanyDocumentsPage() {
  await requireAuth();
  return <UserCompanyDocumentsClient />;
}
