import { AdminCompanyDocumentsClient } from "@/components/operations/AdminCompanyDocumentsClient";
import { requireAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CompanyDocumentsPage() {
  await requireAdminPermission("company_documents:read");
  return <AdminCompanyDocumentsClient />;
}
