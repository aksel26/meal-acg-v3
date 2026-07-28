import { AdminOffboardingClient } from "@/components/operations/AdminOffboardingClient";
import { requireAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OffboardingPage() {
  await requireAdminPermission("offboarding:read");
  return <AdminOffboardingClient />;
}
