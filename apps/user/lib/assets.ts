import type { SessionUser } from "@/lib/auth";
import { getAssetImageSignedUrl } from "@/lib/storage";
import { createWorkClient } from "@/lib/supabase/client-work";

export const ASSET_STATUSES = ["사용중", "보관중", "수리중", "폐기"] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export type AssetImageRecord = {
  id: string;
  asset_id: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number;
  is_primary: boolean;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  signed_url?: string | null;
};

export type AssetRecord = {
  id: string;
  name: string;
  category: string;
  status: AssetStatus;
  purchase_date: string;
  purchase_amount: number;
  user_id: string;
  user_name: string;
  manager_id: string;
  manager_name: string;
  asset_number: string | null;
  serial_number: string | null;
  location: string | null;
  memo: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type AssetSummary = AssetRecord & {
  images: AssetImageRecord[];
  primary_image: AssetImageRecord | null;
  can_edit: boolean;
};

export type AssetPayload = {
  name: string;
  category: string;
  status: AssetStatus;
  purchaseDate: string;
  purchaseAmount: number;
  userId: string;
  userName: string;
  managerId: string;
  managerName: string;
  assetNumber: string | null;
  serialNumber: string | null;
  location: string | null;
  memo: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AssetPayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetPayloadValidationError";
  }
}

export function isAssetStatus(value: unknown): value is AssetStatus {
  return typeof value === "string" && ASSET_STATUSES.includes(value as AssetStatus);
}

export function canUpdateAsset(
  user: SessionUser,
  asset: Pick<AssetRecord, "user_id" | "manager_id">,
) {
  return asset.user_id === user.id || asset.manager_id === user.id;
}

export function parseAssetPayload(
  source: FormData | Record<string, unknown>,
): AssetPayload {
  const getValue = (key: string): FormDataEntryValue | unknown =>
    source instanceof FormData ? source.get(key) : source[key];

  const getString = (key: string): string => {
    const value = getValue(key);
    if (typeof value === "string") {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return "";
  };

  const getOptionalString = (key: string): string | null => {
    const value = getString(key);
    return value.length > 0 ? value : null;
  };

  const name = getString("name");
  const category = getString("category");
  const statusValue = getString("status");
  const purchaseDate = getString("purchaseDate");
  const purchaseAmountValue = getValue("purchaseAmount");
  const userId = getString("userId");
  const userName = getString("userName");
  const managerId = getString("managerId");
  const managerName = getString("managerName");
  const purchaseAmount =
    typeof purchaseAmountValue === "number"
      ? purchaseAmountValue
      : Number(getString("purchaseAmount"));

  if (!name) {
    throw new AssetPayloadValidationError("물품명은 필수입니다.");
  }
  if (!category) {
    throw new AssetPayloadValidationError("카테고리는 필수입니다.");
  }
  if (!isAssetStatus(statusValue)) {
    throw new AssetPayloadValidationError("유효한 상태를 선택해주세요.");
  }
  if (!DATE_PATTERN.test(purchaseDate)) {
    throw new AssetPayloadValidationError("구매일은 YYYY-MM-DD 형식이어야 합니다.");
  }
  if (!Number.isFinite(purchaseAmount) || !Number.isInteger(purchaseAmount) || purchaseAmount < 0) {
    throw new AssetPayloadValidationError("구매금액은 0원 이상의 숫자여야 합니다.");
  }
  if (!userId || !userName) {
    throw new AssetPayloadValidationError("실사용자는 필수입니다.");
  }
  if (!managerId || !managerName) {
    throw new AssetPayloadValidationError("관리 담당자는 필수입니다.");
  }

  return {
    name,
    category,
    status: statusValue,
    purchaseDate,
    purchaseAmount,
    userId,
    userName,
    managerId,
    managerName,
    assetNumber: getOptionalString("assetNumber"),
    serialNumber: getOptionalString("serialNumber"),
    location: getOptionalString("location"),
    memo: getOptionalString("memo"),
  };
}

export async function getAssetById(id: string): Promise<AssetRecord | null> {
  const supabase = createWorkClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as AssetRecord;
}

export async function listAssetsForUser(user: SessionUser): Promise<AssetSummary[]> {
  const supabase = createWorkClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const assets = (data ?? []) as AssetRecord[];
  if (assets.length === 0) {
    return [];
  }

  const { data: imageData, error: imageError } = await supabase
    .from("asset_images")
    .select("*")
    .in(
      "asset_id",
      assets.map((asset) => asset.id),
    )
    .order("created_at", { ascending: true });

  if (imageError) {
    throw imageError;
  }

  const hydratedImages = await Promise.all(
    ((imageData ?? []) as AssetImageRecord[]).map(async (image) => ({
      ...image,
      signed_url: await getAssetImageSignedUrl(image.storage_path),
    })),
  );

  const imagesByAsset = new Map<string, AssetImageRecord[]>();
  for (const image of hydratedImages) {
    const currentImages = imagesByAsset.get(image.asset_id) ?? [];
    currentImages.push(image);
    imagesByAsset.set(image.asset_id, currentImages);
  }

  return assets.map((asset) => {
    const images = imagesByAsset.get(asset.id) ?? [];

    return {
      ...asset,
      images,
      primary_image: images.find((image) => image.is_primary) ?? null,
      can_edit: canUpdateAsset(user, asset),
    };
  });
}
