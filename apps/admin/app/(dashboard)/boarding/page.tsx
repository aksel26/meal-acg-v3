import { AdminBoardingTabs } from "@/components/operations/AdminBoardingTabs";
import { AuthError, requireAdmin } from "@/lib/auth";
import { hasEffectiveAdminPermission } from "@/lib/rbac-server";

export const dynamic = "force-dynamic";

export default async function BoardingPage() {
  const session = await requireAdmin();
  const [canOnboarding, canOffboarding] = await Promise.all([
    hasEffectiveAdminPermission(session, "onboarding:read"),
    hasEffectiveAdminPermission(session, "offboarding:read"),
  ]);
  if (!canOnboarding && !canOffboarding) {
    throw new AuthError("Forbidden: Permission denied", 403);
  }
  return (
    <AdminBoardingTabs
      canOnboarding={canOnboarding}
      canOffboarding={canOffboarding}
    />
  );
}
