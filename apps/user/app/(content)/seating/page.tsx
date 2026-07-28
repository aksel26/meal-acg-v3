import { UserSeatingClient } from "@/components/operations/UserSeatingClient";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SeatingPage() {
  await requireAuth();
  return <UserSeatingClient />;
}
