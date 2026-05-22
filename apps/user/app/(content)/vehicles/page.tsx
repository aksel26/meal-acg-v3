import { requireAuth } from "@/lib/auth";
import { listVehiclesForUser } from "@/lib/vehicles";
import { UserVehicleApplicationClient } from "@/components/vehicles/UserVehicleApplicationClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VehiclesPage() {
  const session = await requireAuth();
  const data = await listVehiclesForUser(session);

  return (
    <UserVehicleApplicationClient
      initialData={data}
      userName={session.fullName}
    />
  );
}
