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
};

export type AssetMemberStatus = {
  id: string;
  full_name: string;
  member_role: string | null;
  team_name: string | null;
  user_asset_count: number;
  manager_asset_count: number;
  latest_asset_name: string | null;
  latest_registered_at: string | null;
};

export type AssetRegisterOverview = {
  assets: AssetSummary[];
  memberStatuses: AssetMemberStatus[];
};
