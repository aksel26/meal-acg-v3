import { AssetRegisterClient } from "@/components/assets/AssetRegisterClient";
import { requireAuth } from "@/lib/auth";
import { listAssetsForUser } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AssetsPage() {
  const session = await requireAuth();
  const assets = await listAssetsForUser(session);

  return (
    <div className="space-y-5">
      <AssetRegisterClient assets={assets} />
    </div>
  );
}
