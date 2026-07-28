import { AdminParkingClient } from "@/components/operations/AdminParkingClient";
import { requireAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ParkingPage() {
  await requireAdminPermission("parking:read");
  return <AdminParkingClient />;
}
