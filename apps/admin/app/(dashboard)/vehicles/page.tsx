import { AdminVehicleManagementClient } from "@/components/vehicles/AdminVehicleManagementClient";
import { listVehicleAdminOverview } from "@/lib/vehicles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminVehiclesPage() {
  const overview = await listVehicleAdminOverview();
  return <AdminVehicleManagementClient initialData={overview} />;
}
