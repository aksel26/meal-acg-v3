import { AdminSeatingClient } from "@/components/operations/AdminSeatingClient";
import { requireAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SeatingPage() {
  await requireAdminPermission("seating:read");
  return <AdminSeatingClient />;
}
