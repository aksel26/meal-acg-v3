"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ImageIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/src/dialog";
import { DatePicker } from "@repo/ui/src/date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import {
  ASSET_STATUSES,
  type AssetImageRecord,
  type AssetStatus,
  type AssetSummary,
} from "@/lib/assets";

type MasterMember = {
  id: string;
  full_name: string;
  role: string | null;
  member_role: string | null;
  team_id: string | null;
};

type AssetFormState = {
  name: string;
  category: string;
  status: AssetStatus;
  purchaseDate: string;
  purchaseAmount: string;
  userId: string;
  userName: string;
  managerId: string;
  managerName: string;
  assetNumber: string;
  serialNumber: string;
  location: string;
  memo: string;
};

const emptyForm: AssetFormState = {
  name: "",
  category: "",
  status: "사용중",
  purchaseDate: "",
  purchaseAmount: "",
  userId: "",
  userName: "",
  managerId: "",
  managerName: "",
  assetNumber: "",
  serialNumber: "",
  location: "",
  memo: "",
};

const inputClass =
  "h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#111111]";
const selectTriggerClass =
  "h-10 w-full rounded-md border-[#e5e7eb] bg-white px-3 text-sm text-slate-700";
const labelClass = "text-xs font-medium text-slate-600";
const uploadInputClass =
  "block w-full text-sm text-slate-600 file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-medium file:text-slate-700";

export function AssetRegisterClient({ assets }: { assets: AssetSummary[] }) {
  const [assetsState, setAssetsState] = useState(assets);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const refreshAssets = useCallback(async (resetFilters = false) => {
    const response = await fetch(`/api/assets?ts=${Date.now()}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "물품 목록을 불러오지 못했습니다.");
    }
    if (resetFilters) {
      setKeyword("");
      setStatusFilter("all");
      setCategoryFilter("all");
    }
    setAssetsState(payload as AssetSummary[]);
  }, []);

  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  const categories = useMemo(
    () =>
      [...new Set(assetsState.map((asset) => asset.category))].sort((a, b) =>
        a.localeCompare(b, "ko-KR"),
      ),
    [assetsState],
  );

  const filteredAssets = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return assetsState.filter((asset) => {
      if (statusFilter !== "all" && asset.status !== statusFilter) return false;
      if (categoryFilter !== "all" && asset.category !== categoryFilter) return false;
      if (!normalized) return true;
      return [
        asset.name,
        asset.asset_number,
        asset.serial_number,
        asset.user_name,
        asset.manager_name,
        asset.location,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [assetsState, categoryFilter, keyword, statusFilter]);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="relative min-w-[280px] flex-1">
          <Search
            size={15}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#111111]"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="물품명, 자산번호, 시리얼번호 검색"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as AssetStatus | "all")}
        >
          <SelectTrigger className="h-9 w-[132px] shrink-0 rounded-lg border-[#e5e7eb] bg-white text-sm text-slate-600">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">전체 상태</SelectItem>
              {ASSET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger className="h-9 w-[148px] shrink-0 rounded-lg border-[#e5e7eb] bg-white text-sm text-slate-600">
            <SelectValue placeholder="전체 카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">전체 카테고리</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="shrink-0">
          <AssetFormDialog mode="create" onSaved={refreshAssets} />
        </div>
      </div>

      <AssetTable
        assets={filteredAssets}
        onPreview={setPreviewUrl}
        onSaved={refreshAssets}
      />
      <AssetMobileList
        assets={filteredAssets}
        onPreview={setPreviewUrl}
        onSaved={refreshAssets}
      />
      <ImagePreviewDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </section>
  );
}

function AssetTable({
  assets,
  onPreview,
  onSaved,
}: {
  assets: AssetSummary[];
  onPreview: (url: string) => void;
  onSaved: (resetFilters?: boolean) => Promise<void>;
}) {
  if (assets.length === 0) return <EmptyState />;

  return (
    <div className="hidden overflow-hidden rounded-xl border border-[#f3f3f3] bg-white md:!block">
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
            <col className="w-[88px]" />
          </colgroup>
          <thead className="border-b border-[#f3f3f3] bg-[#fafafa]">
            <tr className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              <th className="px-4 py-2.5">이미지</th>
              <th className="px-4 py-2.5">물품명</th>
              <th className="px-4 py-2.5">카테고리</th>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">실사용자</th>
              <th className="px-4 py-2.5">관리 담당자</th>
              <th className="px-4 py-2.5">구매일</th>
              <th className="px-4 py-2.5">구매금액</th>
              <th className="px-4 py-2.5">위치</th>
              <th className="px-4 py-2.5">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f3f3]">
            {assets.map((asset) => (
              <tr key={asset.id} className="transition-colors hover:bg-[#fafafa]">
                <td className="px-4 py-3">
                  <AssetThumbnail asset={asset} onPreview={onPreview} />
                </td>
                <td className="px-4 py-3">
                  <p className="truncate text-sm font-medium text-[#111111]">
                    {asset.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {asset.asset_number || asset.serial_number || "-"}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {asset.category}
                </td>
                <td className="px-4 py-3">
                  <AssetStatusBadge status={asset.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {asset.user_name}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {asset.manager_name}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {asset.purchase_date}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {asset.purchase_amount.toLocaleString("ko-KR")}원
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {asset.location || "-"}
                </td>
                <td className="px-4 py-3">
                  {asset.can_edit ? (
                    <AssetFormDialog mode="edit" asset={asset} onSaved={onSaved} />
                  ) : (
                    <span className="text-xs text-slate-300">조회</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssetMobileList({
  assets,
  onPreview,
  onSaved,
}: {
  assets: AssetSummary[];
  onPreview: (url: string) => void;
  onSaved: (resetFilters?: boolean) => Promise<void>;
}) {
  if (assets.length === 0) return null;

  return (
    <div className="space-y-2 md:!hidden">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="rounded-xl border border-[#f3f3f3] bg-white p-3"
        >
          <div className="flex gap-3">
            <AssetThumbnail asset={asset} onPreview={onPreview} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#111111]">
                    {asset.name}
                  </p>
                  <p className="text-xs text-slate-400">{asset.category}</p>
                </div>
                <AssetStatusBadge status={asset.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <p className="truncate">실사용자 {asset.user_name}</p>
                <p className="truncate">담당 {asset.manager_name}</p>
                <p>{asset.purchase_date}</p>
                <p>{asset.purchase_amount.toLocaleString("ko-KR")}원</p>
              </div>
              <div className="mt-3 flex justify-end">
                {asset.can_edit ? (
                  <AssetFormDialog mode="edit" asset={asset} onSaved={onSaved} />
                ) : (
                  <span className="text-xs text-slate-300">조회만 가능</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssetFormDialog({
  mode,
  asset,
  onSaved,
}: {
  mode: "create" | "edit";
  asset?: AssetSummary;
  onSaved: (resetFilters?: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [form, setForm] = useState<AssetFormState>(() => toFormState(asset));
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [extraImage, setExtraImage] = useState<File | null>(null);
  const [primaryImagePreviewUrl, setPrimaryImagePreviewUrl] = useState<
    string | null
  >(null);
  const [extraImagePreviewUrl, setExtraImagePreviewUrl] = useState<
    string | null
  >(null);
  const [primaryImageInputKey, setPrimaryImageInputKey] = useState(0);
  const [extraImageInputKey, setExtraImageInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(asset));
    setPrimaryImage(null);
    setExtraImage(null);
    setPrimaryImageInputKey((current) => current + 1);
    setExtraImageInputKey((current) => current + 1);
    setError(null);
    fetch("/api/masters")
      .then((response) => response.json())
      .then((payload) => setMembers(payload.members ?? []))
      .catch(() => setMembers([]));
  }, [asset, open]);

  useEffect(() => {
    if (!primaryImage) {
      setPrimaryImagePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(primaryImage);
    setPrimaryImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [primaryImage]);

  useEffect(() => {
    if (!extraImage) {
      setExtraImagePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(extraImage);
    setExtraImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [extraImage]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "create") {
        const formData = buildAssetFormData(form);
        if (primaryImage) formData.set("primaryImage", primaryImage);

        const response = await fetch("/api/assets", {
          method: "POST",
          body: formData,
        });
        await assertOk(response, "물품 등록에 실패했습니다.");
      } else if (asset) {
        const response = await fetch(`/api/assets/${asset.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        await assertOk(response, "물품 수정에 실패했습니다.");

        if (primaryImage) {
          await uploadImage(asset.id, primaryImage, true);
        }
        if (extraImage) {
          await uploadImage(asset.id, extraImage, false);
        }
      }

      toast.success(mode === "create" ? "물품을 등록했습니다." : "물품을 수정했습니다.");
      setOpen(false);
      await onSaved(mode === "create");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "물품 정보를 저장하지 못했습니다.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteImage(image: AssetImageRecord) {
    if (!asset || image.is_primary) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/assets/${asset.id}/images/${image.id}`, {
        method: "DELETE",
      });
      await assertOk(response, "이미지를 삭제하지 못했습니다.");
      toast.success("이미지를 삭제했습니다.");
      await onSaved();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "이미지를 삭제하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedUser = members.find((member) => member.id === form.userId);
  const selectedManager = members.find((member) => member.id === form.managerId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            mode === "create"
              ? "inline-flex h-10 items-center gap-1.5 rounded-md bg-[#111111] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#222222]"
              : "inline-flex h-8 items-center gap-1 rounded-md border border-[#e5e7eb] bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-[#111111] hover:text-[#111111]"
          }
        >
          {mode === "create" ? (
            <>
              <Plus size={16} strokeWidth={1.5} />
              물품 등록
            </>
          ) : (
            <>
              <Pencil size={13} strokeWidth={1.5} />
              수정
            </>
          )}
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] gap-0 overflow-hidden p-0"
        style={{
          width: "min(920px, calc(100vw - 2rem))",
          maxWidth: "min(920px, calc(100vw - 2rem))",
        }}
      >
        <DialogHeader className="border-b border-[#f3f3f3] px-5 py-4">
          <DialogTitle className="text-base font-semibold text-[#111111]">
            {mode === "create" ? "물품 등록" : "물품 수정"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={submit}
          className="max-h-[calc(85vh-68px)] overflow-y-auto"
        >
          <div className="px-5 py-5">
            <div className="grid gap-7">
              <AssetFormSection title="기본 정보">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="물품명" required>
                    <input
                      required
                      className={inputClass}
                      value={form.name}
                      onChange={(event) =>
                        setFormField(setForm, "name", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="카테고리" required>
                    <input
                      required
                      className={inputClass}
                      value={form.category}
                      onChange={(event) =>
                        setFormField(setForm, "category", event.target.value)
                      }
                      placeholder="노트북, 모니터, 장비"
                    />
                  </Field>
                  <Field label="상태" required>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setFormField(
                          setForm,
                          "status",
                          value as AssetStatus,
                        )
                      }
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="상태 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ASSET_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </AssetFormSection>

              <AssetFormSection title="구매 및 보관">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="구매일" required>
                    <DatePicker
                      value={form.purchaseDate}
                      onChange={(value) =>
                        setFormField(setForm, "purchaseDate", value)
                      }
                      placeholder="구매일 선택"
                      className="h-10 border-[#e5e7eb] bg-white"
                      modal
                    />
                  </Field>
                  <Field label="구매금액" required>
                    <input
                      required
                      type="number"
                      min={0}
                      step={1}
                      className={inputClass}
                      value={form.purchaseAmount}
                      onChange={(event) =>
                        setFormField(
                          setForm,
                          "purchaseAmount",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="보관 위치">
                    <input
                      className={inputClass}
                      value={form.location}
                      onChange={(event) =>
                        setFormField(setForm, "location", event.target.value)
                      }
                    />
                  </Field>
                </div>
              </AssetFormSection>

              <AssetFormSection title="사용자 및 식별 정보">
                <div className="grid gap-4 md:grid-cols-2">
                  <MemberSelect
                    label="실사용자"
                    required
                    members={members}
                    value={form.userId}
                    selectedName={selectedUser?.full_name || form.userName}
                    onChange={(member) =>
                      setForm((current) => ({
                        ...current,
                        userId: member.id,
                        userName: member.full_name,
                      }))
                    }
                  />
                  <MemberSelect
                    label="관리 담당자"
                    required
                    members={members}
                    value={form.managerId}
                    selectedName={selectedManager?.full_name || form.managerName}
                    onChange={(member) =>
                      setForm((current) => ({
                        ...current,
                        managerId: member.id,
                        managerName: member.full_name,
                      }))
                    }
                  />
                  <Field label="자산번호">
                    <input
                      className={inputClass}
                      value={form.assetNumber}
                      onChange={(event) =>
                        setFormField(setForm, "assetNumber", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="시리얼번호">
                    <input
                      className={inputClass}
                      value={form.serialNumber}
                      onChange={(event) =>
                        setFormField(setForm, "serialNumber", event.target.value)
                      }
                    />
                  </Field>
                </div>
              </AssetFormSection>

              <AssetFormSection title="이미지">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={mode === "create" ? "대표 이미지" : "대표 이미지 교체"}
                    required={mode === "create"}
                  >
                    <input
                      key={primaryImageInputKey}
                      required={mode === "create"}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className={uploadInputClass}
                      onChange={(event) => setPrimaryImage(getFirstFile(event))}
                    />
                    <SelectedImagePreview
                      file={primaryImage}
                      label="대표 이미지"
                      url={primaryImagePreviewUrl}
                      onRemove={() => {
                        setPrimaryImage(null);
                        setPrimaryImageInputKey((current) => current + 1);
                      }}
                    />
                  </Field>
                  {mode === "edit" && (
                    <Field label="추가 이미지">
                      <input
                        key={extraImageInputKey}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className={uploadInputClass}
                        onChange={(event) => setExtraImage(getFirstFile(event))}
                      />
                      <SelectedImagePreview
                        file={extraImage}
                        label="추가 이미지"
                        url={extraImagePreviewUrl}
                        onRemove={() => {
                          setExtraImage(null);
                          setExtraImageInputKey((current) => current + 1);
                        }}
                      />
                    </Field>
                  )}
                </div>

                {mode === "edit" && asset && (
                  <div className="pt-2">
                    <p className={`${labelClass} mb-2`}>등록 이미지</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {asset.images.map((image) => (
                        <div
                          key={image.id}
                          className="relative overflow-hidden rounded-lg border border-[#f3f3f3] bg-slate-50"
                        >
                          {image.signed_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image.signed_url}
                              alt={image.file_name}
                              className="aspect-square w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-square items-center justify-center text-slate-300">
                              <ImageIcon size={24} />
                            </div>
                          )}
                          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500">
                            <span>{image.is_primary ? "대표" : "추가"}</span>
                            {!image.is_primary && (
                              <button
                                type="button"
                                onClick={() => deleteImage(image)}
                                className="text-slate-400 hover:text-red-500"
                                disabled={submitting}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AssetFormSection>

              <AssetFormSection title="메모">
                <Field label="메모">
                  <textarea
                    className="min-h-[84px] w-full resize-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#111111]"
                    value={form.memo}
                    onChange={(event) =>
                      setFormField(setForm, "memo", event.target.value)
                    }
                  />
                </Field>
              </AssetFormSection>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-[#f3f3f3] px-5 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-md border border-[#e5e7eb] px-4 text-sm font-medium text-slate-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 rounded-md bg-[#111111] px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? "저장 중" : "저장"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="space-y-1.5">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function AssetFormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MemberSelect({
  label,
  required = false,
  members,
  value,
  selectedName,
  onChange,
}: {
  label: string;
  required?: boolean;
  members: MasterMember[];
  value: string;
  selectedName: string;
  onChange: (member: MasterMember) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <Select
        value={value || undefined}
        onValueChange={(nextValue) => {
          const member = members.find((item) => item.id === nextValue);
          if (member) onChange(member);
        }}
      >
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue placeholder={selectedName || "선택"} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  );
}

function SelectedImagePreview({
  file,
  label,
  url,
  onRemove,
}: {
  file: File | null;
  label: string;
  url: string | null;
  onRemove: () => void;
}) {
  if (!file || !url) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[#f3f3f3]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`${label} 미리보기`}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs text-slate-500">{file.name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-red-500"
          aria-label={`${label} 선택 취소`}
        >
          <X size={14} />
        </button>
      </div>
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
      ? "bg-emerald-50 text-emerald-700"
      : status === "보관중"
        ? "bg-slate-100 text-slate-600"
        : status === "수리중"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-500";

  return (
    <span className={`inline-flex rounded px-2 py-1 text-[11px] font-medium ${className}`}>
      {status}
    </span>
  );
}

function ImagePreviewDialog({
  url,
  onClose,
}: {
  url: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(url)} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-3xl p-0">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm"
        >
          <X size={16} />
        </button>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="물품 이미지" className="max-h-[80vh] w-full object-contain" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white px-6 py-10 text-center">
      <p className="text-sm text-slate-500">등록된 물품이 없습니다.</p>
    </div>
  );
}

function toFormState(asset?: AssetSummary): AssetFormState {
  if (!asset) return emptyForm;
  return {
    name: asset.name,
    category: asset.category,
    status: asset.status,
    purchaseDate: asset.purchase_date,
    purchaseAmount: String(asset.purchase_amount),
    userId: asset.user_id,
    userName: asset.user_name,
    managerId: asset.manager_id,
    managerName: asset.manager_name,
    assetNumber: asset.asset_number ?? "",
    serialNumber: asset.serial_number ?? "",
    location: asset.location ?? "",
    memo: asset.memo ?? "",
  };
}

function setFormField<K extends keyof AssetFormState>(
  setForm: React.Dispatch<React.SetStateAction<AssetFormState>>,
  key: K,
  value: AssetFormState[K],
) {
  setForm((current) => ({ ...current, [key]: value }));
}

function buildAssetFormData(form: AssetFormState) {
  const formData = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    formData.set(key, value);
  });
  return formData;
}

function getFirstFile(event: ChangeEvent<HTMLInputElement>) {
  return event.target.files?.[0] ?? null;
}

async function uploadImage(assetId: string, file: File, isPrimary: boolean) {
  const imageData = new FormData();
  imageData.set("file", file);
  imageData.set("isPrimary", String(isPrimary));
  const response = await fetch(`/api/assets/${assetId}/images`, {
    method: "POST",
    body: imageData,
  });
  await assertOk(response, "이미지를 업로드하지 못했습니다.");
}

async function assertOk(response: Response, fallback: string) {
  if (response.ok) return;
  const payload = await response.json().catch(() => ({}));
  throw new Error(
    typeof payload.error === "string" && payload.error ? payload.error : fallback,
  );
}
