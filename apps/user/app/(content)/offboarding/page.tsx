import { UserOffboardingClient } from "@/components/operations/UserOffboardingClient";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OffboardingPage() {
  await requireAuth();
  return <UserOffboardingClient />;
}
