import { AssetRegisterClient } from "@/components/assets/AssetRegisterClient";
import { requireAuth } from "@/lib/auth";
import { listAssetsForUser } from "@/lib/assets";

export default async function AssetsPage() {
  const session = await requireAuth();
  const assets = await listAssetsForUser(session);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#111111]">물품관리대장</h1>
      </div>
      <AssetRegisterClient assets={assets} />
    </div>
  );
}
