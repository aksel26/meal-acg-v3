import { UserParkingClient } from "@/components/operations/UserParkingClient";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ParkingPage() {
  await requireAuth();
  return <UserParkingClient />;
}
