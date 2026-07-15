"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Search } from "lucide-react";

import {
  ASSET_STATUSES,
  type AssetMemberStatus,
  type AssetStatus,
  type AssetSummary,
} from "@/lib/assets-types";

type AdminAssetRegisterClientProps = {
  assets: AssetSummary[];
  memberStatuses: AssetMemberStatus[];
};

const ASSET_PAGE_SIZE = 20;

export function AdminAssetRegisterClient({
  assets,
  memberStatuses,
}: AdminAssetRegisterClientProps) {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assetUserFilter, setAssetUserFilter] = useState("all");
  const [assetPage, setAssetPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      [...new Set(assets.map((asset) => asset.category))].sort((a, b) =>
        a.localeCompare(b, "ko-KR"),
      ),
    [assets],
  );

  const assetUsers = useMemo(
    () =>
      [...new Map(assets.map((asset) => [asset.user_id, asset.user_name])).entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, "ko-KR")),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return assets.filter((asset) => {
      if (statusFilter !== "all" && asset.status !== statusFilter) return false;
      if (categoryFilter !== "all" && asset.category !== categoryFilter) return false;
      if (assetUserFilter !== "all" && asset.user_id !== assetUserFilter) return false;
      if (!normalized) return true;
      return [
        asset.name,
        asset.asset_number,
        asset.serial_number,
        asset.user_name,
        asset.manager_name,
        asset.created_by_name,
        asset.location,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [assetUserFilter, assets, categoryFilter, keyword, statusFilter]);

  const assetPagination = usePagination(filteredAssets.length, ASSET_PAGE_SIZE, assetPage);
  const pagedAssets = filteredAssets.slice(
    assetPagination.startIndex,
    assetPagination.endIndex,
  );

  useEffect(() => {
    setAssetPage(1);
  }, [assetUserFilter, categoryFilter, keyword, statusFilter]);

  const summary = useMemo(() => {
    const registeredMembers = memberStatuses.filter(
      (member) => member.user_asset_count > 0,
    ).length;
    const totalAmount = assets.reduce(
      (sum, asset) => sum + asset.purchase_amount,
      0,
    );
    const statusCounts = ASSET_STATUSES.reduce<Record<AssetStatus, number>>(
      (acc, status) => {
        acc[status] = assets.filter((asset) => asset.status === status).length;
        return acc;
      },
      {
        사용중: 0,
        보관중: 0,
        수리중: 0,
        폐기: 0,
      },
    );

    return {
      registeredMembers,
      unregisteredMembers: memberStatuses.length - registeredMembers,
      totalAmount,
      statusCounts,
    };
  }, [assets, memberStatuses]);

  return (
    <div className="space-y-5">
      <section className="grid gap-y-3 bg-white md:grid-cols-4 md:divide-x md:divide-[#eeeeee]">
        <SummaryCard label="등록 물품" value={`${assets.length.toLocaleString("ko-KR")}건`} />
        <SummaryCard
          label="등록 구성원"
          value={`${summary.registeredMembers.toLocaleString("ko-KR")}명`}
          caption={`미등록 ${summary.unregisteredMembers.toLocaleString("ko-KR")}명`}
        />
        <SummaryCard
          label="사용중"
          value={`${summary.statusCounts["사용중"].toLocaleString("ko-KR")}건`}
          caption={`보관 ${summary.statusCounts["보관중"].toLocaleString("ko-KR")} · 수리 ${summary.statusCounts["수리중"].toLocaleString("ko-KR")}`}
        />
        <SummaryCard
          label="구매금액 합계"
          value={`${summary.totalAmount.toLocaleString("ko-KR")}원`}
        />
      </section>

      <section className="space-y-3 rounded-xl bg-white py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#111111]">
              구성원 전체 등록 현황
            </h2>
            <p className="text-xs text-slate-500">
              구성원이 등록한 전체 물품을 조건별로 조회합니다.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-[220px_132px_148px_148px]">
            <div className="relative">
              <Search
                size={15}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="h-9 w-full rounded-lg bg-[#f5f5f7] pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:bg-white"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="이름 검색"
              />
            </div>
            <select
              className="h-9 w-full rounded-lg bg-[#f5f5f7] px-3 text-sm text-slate-600 outline-none transition-colors focus:bg-white"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as AssetStatus | "all")
              }
            >
              <option value="all">전체 상태</option>
              {ASSET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              className="h-9 w-full rounded-lg bg-[#f5f5f7] px-3 text-sm text-slate-600 outline-none transition-colors focus:bg-white"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">전체 카테고리</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="h-9 w-full rounded-lg bg-[#f5f5f7] px-3 text-sm text-slate-600 outline-none transition-colors focus:bg-white"
              value={assetUserFilter}
              onChange={(event) => setAssetUserFilter(event.target.value)}
            >
              <option value="all">전체 실사용자</option>
              {assetUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AssetTable assets={pagedAssets} onPreview={setPreviewUrl} />
        <Pagination
          page={assetPagination.page}
          totalPages={assetPagination.totalPages}
          totalItems={filteredAssets.length}
          startItem={assetPagination.startItem}
          endItem={assetPagination.endItem}
          onPageChange={setAssetPage}
        />
      </section>

      {previewUrl && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPreviewUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="물품 이미지"
            className="max-h-[80vh] max-w-full rounded-lg bg-white object-contain"
          />
        </button>
      )}
    </div>
  );
}

function AssetTable({
  assets,
  onPreview,
}: {
  assets: AssetSummary[];
  onPreview: (url: string) => void;
}) {
  if (assets.length === 0) {
    return (
      <div className="rounded-xl bg-white px-6 py-10 text-center">
        <p className="text-sm text-slate-500">조건에 맞는 물품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed text-left">
          <colgroup>
            <col className="w-[88px]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[80px]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[104px]" />
            <col className="w-[120px]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-[#fafafa]">
            <tr className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              <th className="px-0 py-2.5">이미지</th>
              <th className="px-0 py-2.5">물품명</th>
              <th className="px-0 py-2.5">카테고리</th>
              <th className="px-0 py-2.5">상태</th>
              <th className="px-0 py-2.5">실사용자</th>
              <th className="px-0 py-2.5">관리 담당자</th>
              <th className="px-0 py-2.5">구매일</th>
              <th className="px-0 py-2.5">구매금액</th>
              <th className="px-0 py-2.5">위치</th>
              <th className="px-0 py-2.5">등록자</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="transition-colors hover:bg-[#fafafa]">
                <td className="px-0 py-3">
                  <AssetThumbnail asset={asset} onPreview={onPreview} />
                </td>
                <td className="px-0 py-3">
                  <p className="truncate text-sm font-medium text-[#111111]">
                    {asset.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {asset.asset_number || asset.serial_number || "-"}
                  </p>
                </td>
                <td className="px-0 py-3 text-xs text-slate-500">
                  {asset.category}
                </td>
                <td className="px-0 py-3">
                  <AssetStatusBadge status={asset.status} />
                </td>
                <td className="px-0 py-3 text-xs text-slate-500">
                  {asset.user_name}
                </td>
                <td className="px-0 py-3 text-xs text-slate-500">
                  {asset.manager_name}
                </td>
                <td className="px-0 py-3 text-xs text-slate-500">
                  {asset.purchase_date}
                </td>
                <td className="px-0 py-3 text-xs text-slate-500">
                  {asset.purchase_amount.toLocaleString("ko-KR")}원
                </td>
                <td className="px-0 py-3 text-xs text-slate-500">
                  {asset.location || "-"}
                </td>
                <td className="px-0 py-3 text-xs text-slate-500">
                  <p>{asset.created_by_name}</p>
                  <p className="text-slate-400">{formatDate(asset.created_at)}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="bg-white px-4 py-3 first:pl-0 last:pr-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#111111]">{value}</p>
      {caption && <p className="mt-1 text-xs text-slate-400">{caption}</p>}
    </div>
  );
}

function AssetThumbnail({
  asset,
  onPreview,
}: {
  asset: AssetSummary;
  onPreview: (url: string) => void;
}) {
  const url = asset.primary_image?.signed_url;

  if (!url) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
        <ImageIcon size={20} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(url)}
      className="block h-14 w-14 overflow-hidden rounded-lg bg-slate-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={asset.name} className="h-full w-full object-cover" />
    </button>
  );
}

function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const className =
    status === "사용중"
      ? "bg-slate-50 text-slate-700"
      : status === "보관중"
        ? "bg-slate-100 text-slate-600"
        : status === "수리중"
          ? "bg-slate-50 text-slate-700"
          : "bg-slate-100 text-slate-500";

  return (
    <span className={`inline-flex rounded px-2 py-1 text-[11px] font-medium ${className}`}>
      {status}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

function Pagination({
  page,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col gap-2 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
      <p>
        {startItem.toLocaleString("ko-KR")}-{endItem.toLocaleString("ko-KR")} /{" "}
        {totalItems.toLocaleString("ko-KR")}건
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="이전 페이지"
        >
          <ChevronLeft size={15} strokeWidth={1.5} />
        </button>
        <span className="min-w-16 text-center font-medium text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="다음 페이지"
        >
          <ChevronRight size={15} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function usePagination(totalItems: number, pageSize: number, currentPage: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    page,
    totalPages,
    startIndex,
    endIndex,
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: endIndex,
  };
}
