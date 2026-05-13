"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/src/dialog";
import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";

type MasterMember = {
  id: string;
  full_name: string;
  role: string | null;
  member_role: string | null;
  team_id: string | null;
};

type MasterClient = {
  id: string;
  name: string;
  parent_company: string | null;
};

type MasterTeam = {
  id: string;
  name: string;
};

const inputClass =
  "h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#111111]";
const labelClass = "text-xs font-medium text-slate-600";

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [teams, setTeams] = useState<MasterTeam[]>([]);
  const [clients, setClients] = useState<MasterClient[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [stakeholderSearch, setStakeholderSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    customerNames: [] as string[],
    affiliateNames: [] as string[],
    managerIds: [] as string[],
    stakeholderIds: [] as string[],
    stakeholderTeamIds: [] as string[],
    startDate: "",
    dueDate: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch("/api/masters")
      .then((response) => response.json())
      .then((payload) => {
        setMembers(payload.members ?? []);
        setTeams(payload.teams ?? []);
        setClients(payload.clients ?? []);
      })
      .catch(() => {
        setMembers([]);
        setTeams([]);
        setClients([]);
      });
  }, [open]);

  const customerOptions = useMemo(
    () =>
      [...new Set(clients.map((client) => client.parent_company || client.name))].sort(
        (a, b) => a.localeCompare(b, "ko-KR"),
      ),
    [clients],
  );

  const affiliateOptions = useMemo(() => {
    if (form.customerNames.length === 0) return [];
    return clients
      .filter((client) =>
        form.customerNames.includes(client.parent_company || client.name),
      )
      .map((client) => client.name)
      .sort((a, b) => a.localeCompare(b, "ko-KR"));
  }, [clients, form.customerNames]);

  const selectedManagers = members.filter((member) =>
    form.managerIds.includes(member.id),
  );
  const selectedStakeholders = members.filter((member) =>
    form.stakeholderIds.includes(member.id),
  );
  const selectedStakeholderTeams = teams.filter((team) =>
    form.stakeholderTeamIds.includes(team.id),
  );

  const filteredMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return members;

    return members.filter((member) =>
      [member.full_name, member.member_role, member.role]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [memberSearch, members]);

  const filteredStakeholders = useMemo(() => {
    const keyword = stakeholderSearch.trim().toLowerCase();
    if (!keyword) return members;

    return members.filter((member) =>
      [member.full_name, member.member_role, member.role]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [members, stakeholderSearch]);

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          managerNames: selectedManagers.map((member) => member.full_name),
          stakeholderNames: selectedStakeholders.map((member) => member.full_name),
          stakeholderTeamNames: selectedStakeholderTeams.map((team) => team.name),
          ownerId: form.managerIds[0] ?? null,
          ownerName: selectedManagers[0]?.full_name ?? null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "프로젝트 생성에 실패했습니다.");
      }
      setOpen(false);
      setForm({
        title: "",
        description: "",
        customerNames: [],
        affiliateNames: [],
        managerIds: [],
        stakeholderIds: [],
        stakeholderTeamIds: [],
        startDate: "",
        dueDate: "",
      });
      setMemberSearch("");
      setStakeholderSearch("");
      router.push(`/projects/${payload.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "프로젝트 생성에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function toggleArrayField(
    field:
      | "customerNames"
      | "affiliateNames"
      | "managerIds"
      | "stakeholderIds"
      | "stakeholderTeamIds",
    value: string,
  ) {
    setForm((current) => {
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists
          ? current[field].filter((item) => item !== value)
          : [...current[field], value],
        ...(field === "customerNames" ? { affiliateNames: [] } : {}),
      };
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#111111] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#222222]"
        >
          <Plus size={16} strokeWidth={1.5} />
          새 프로젝트
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] gap-0 overflow-hidden p-0"
        style={{
          width: "min(900px, calc(100vw - 2rem))",
          maxWidth: "min(900px, calc(100vw - 2rem))",
        }}
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (
            target?.closest("[data-radix-popper-content-wrapper]") ||
            target?.closest("[data-radix-popover-content]") ||
            target?.closest("[data-slot='popover-content']") ||
            target?.closest("[role='dialog'][data-state='open']") !== event.currentTarget
          ) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (
            target?.closest("[data-radix-popper-content-wrapper]") ||
            target?.closest("[data-radix-popover-content]") ||
            target?.closest("[data-slot='popover-content']")
          ) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b border-[#f3f3f3] px-5 py-4">
          <DialogTitle>새 프로젝트</DialogTitle>
        </DialogHeader>
        <form
          className="max-h-[calc(85vh-73px)] space-y-4 overflow-y-auto px-5 py-5"
          onSubmit={submitProject}
        >
          <section className="grid grid-cols-2 gap-4">
            <label className="col-span-2 block">
              <span className={labelClass}>프로젝트명</span>
              <input
                className={`mt-1.5 ${inputClass}`}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="예: SK 상반기 채용 운영"
              />
            </label>

            <div className="col-span-2">
              <span className={labelClass}>기간</span>
              <DateRangePicker
                className="mt-1.5 h-10 rounded-md border-[#e5e7eb] px-3 text-sm text-slate-700 hover:bg-white"
                startDate={form.startDate}
                endDate={form.dueDate}
                modal
                placeholder="시작일과 마감일 선택"
                onChange={(range) =>
                  setForm((current) => ({
                    ...current,
                    startDate: range.startDate,
                    dueDate: range.endDate,
                  }))
                }
              />
            </div>

            <div>
              <MemberDropdown
                label="담당자"
                emptyText="담당자 선택"
                members={filteredMembers}
                selectedMembers={selectedManagers}
                selectedIds={form.managerIds}
                searchValue={memberSearch}
                searchPlaceholder="담당자 검색"
                onSearchChange={setMemberSearch}
                onToggle={(value) => toggleArrayField("managerIds", value)}
              />
              <div className="mt-4">
                <MemberDropdown
                  label="관련자"
                  emptyText="관련자 선택"
                  members={filteredStakeholders}
                  selectedMembers={selectedStakeholders}
                  selectedIds={form.stakeholderIds}
                  searchValue={stakeholderSearch}
                  searchPlaceholder="관련자 검색"
                  onSearchChange={setStakeholderSearch}
                  onToggle={(value) => toggleArrayField("stakeholderIds", value)}
                />
              </div>
              <div className="mt-4">
                <TeamDropdown
                  teams={teams}
                  selectedTeams={selectedStakeholderTeams}
                  selectedIds={form.stakeholderTeamIds}
                  onToggle={(value) => toggleArrayField("stakeholderTeamIds", value)}
                />
              </div>
            </div>

            <label className="block">
              <span className={labelClass}>안내문</span>
              <textarea
                className="mt-1.5 min-h-28 w-full resize-y rounded-md border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none transition-colors focus:border-[#111111]"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="프로젝트 목적, 범위, 참고해야 할 고정 안내를 적어주세요."
              />
            </label>
          </section>

          <section className="grid grid-cols-2 gap-4 border-t border-[#f3f3f3] pt-4">
            <SelectionGroup
              label="고객사"
              options={customerOptions}
              selected={form.customerNames}
              onToggle={(value) => toggleArrayField("customerNames", value)}
            />
            <SelectionGroup
              label="계열사"
              options={affiliateOptions}
              selected={form.affiliateNames}
              emptyText="고객사를 먼저 선택하면 계열사를 고를 수 있습니다."
              onToggle={(value) => toggleArrayField("affiliateNames", value)}
            />
          </section>

          {error && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="h-10 rounded-md border border-[#e5e7eb] px-4 text-sm font-medium text-slate-600"
              type="button"
              onClick={() => setOpen(false)}
            >
              취소
            </button>
            <button
              className="h-10 rounded-md bg-[#111111] px-4 text-sm font-medium text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || !form.title.trim()}
              type="submit"
            >
              생성
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamDropdown({
  teams,
  selectedTeams,
  selectedIds,
  onToggle,
}: {
  teams: MasterTeam[];
  selectedTeams: MasterTeam[];
  selectedIds: string[];
  onToggle: (value: string) => void;
}) {
  const displayText =
    selectedTeams.length > 0
      ? selectedTeams.map((team) => team.name).join(", ")
      : "관련팀 선택";

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className={labelClass}>관련팀</h3>
        {selectedIds.length > 0 && (
          <span className="text-xs text-slate-400">{selectedIds.length}개 선택</span>
        )}
      </div>
      <Popover modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 text-left text-sm text-slate-700 outline-none transition-colors hover:border-[#111111]"
          >
            <span className="truncate">{displayText}</span>
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-2"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <div className="max-h-48 overflow-y-auto">
            {teams.map((team) => {
              const checked = selectedIds.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-[#f9f9fa]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onToggle(team.id)}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center rounded border border-[#d4d8de]">
                    {checked && <Check className="size-3 text-[#111111]" />}
                  </span>
                  <span className="truncate">{team.name}</span>
                </button>
              );
            })}
            {teams.length === 0 && (
              <p className="px-2 py-2 text-sm text-slate-400">
                팀 데이터가 없습니다.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </section>
  );
}

function MemberDropdown({
  label,
  emptyText,
  members,
  selectedMembers,
  selectedIds,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onToggle,
}: {
  label: string;
  emptyText: string;
  members: MasterMember[];
  selectedMembers: MasterMember[];
  selectedIds: string[];
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onToggle: (value: string) => void;
}) {
  const displayText =
    selectedMembers.length > 0
      ? selectedMembers.map((member) => member.full_name).join(", ")
      : emptyText;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className={labelClass}>{label}</h3>
        {selectedIds.length > 0 && (
          <span className="text-xs text-slate-400">{selectedIds.length}명 선택</span>
        )}
      </div>
      <Popover modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 text-left text-sm text-slate-700 outline-none transition-colors hover:border-[#111111]"
          >
            <span className="truncate">{displayText}</span>
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-2"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <input
            className={inputClass}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
          <div className="mt-2 max-h-48 overflow-y-auto">
            {members.map((member) => {
              const checked = selectedIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-[#f9f9fa]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onToggle(member.id)}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center rounded border border-[#d4d8de]">
                    {checked && <Check className="size-3 text-[#111111]" />}
                  </span>
                  <span className="truncate">
                    {member.full_name}
                    {member.member_role ? ` (${member.member_role})` : ""}
                  </span>
                </button>
              );
            })}
            {members.length === 0 && (
              <p className="px-2 py-2 text-sm text-slate-400">
                {searchValue.trim() ? "검색 결과가 없습니다." : "직원 데이터가 없습니다."}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </section>
  );
}

function SelectionGroup({
  label,
  options,
  optionKeys,
  selected,
  searchValue,
  searchPlaceholder,
  emptyText = "선택 가능한 항목이 없습니다.",
  onSearchChange,
  onToggle,
}: {
  label: string;
  options: string[];
  optionKeys?: string[];
  selected: string[];
  searchValue?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onSearchChange?: (value: string) => void;
  onToggle: (value: string) => void;
}) {
  return (
    <section className="flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className={labelClass}>{label}</h3>
        {selected.length > 0 && (
          <span className="text-xs text-slate-400">{selected.length}개 선택</span>
        )}
      </div>
      {onSearchChange && (
        <input
          className={`mb-2 ${inputClass}`}
          value={searchValue ?? ""}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
      )}
      {options.length === 0 ? (
        <p className="rounded-md bg-[#f9f9fa] px-3 py-3 text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="max-h-36 overflow-y-auto rounded-md border border-[#e5e7eb] bg-white p-2">
          {options.map((option, index) => {
            const value = optionKeys?.[index] ?? option;
            const checked = selected.includes(value);
            return (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-[#f9f9fa]"
              >
                <input
                  checked={checked}
                  className="size-4"
                  type="checkbox"
                  onChange={() => onToggle(value)}
                />
                <span className="truncate">{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
