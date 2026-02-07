"use client";

import { useState, useMemo, memo } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderTree,
  Loader2,
  Plus,
  Trash2,
  User,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Badge } from "@repo/ui/src/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";

import { useOrganizationTree } from "@/hooks/useOrganizationTree";
import type {
  OrgDivision,
  OrgTeam,
  OrgMember,
} from "@/hooks/useOrganizationTree";
import {
  useCreateDivision,
  useUpdateDivision,
  useDeleteDivision,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useUpdateMemberOrg,
  useBatchAssignMembers,
} from "@/hooks/useOrganizationMutations";
import { Checkbox } from "@repo/ui/src/checkbox";
import { useActiveStatusMembers } from "@/hooks/useActiveStatusMembers";
import { STATUS_COLORS, roleBadgeStyle } from "@/lib/constants";

// ── Types for dialog state ──

type DialogMode =
  | { type: "createDivision" }
  | { type: "editDivision"; division: OrgDivision }
  | { type: "createTeam"; divisionId?: string }
  | { type: "editTeam"; team: OrgTeam }
  | { type: "editMember"; member: OrgMember };

// ── Member Row Component ──

const MemberRow = memo(function MemberRow({
  member,
  onEdit,
  status,
}: {
  member: OrgMember;
  onEdit: (member: OrgMember) => void;
  status?: string;
}) {
  return (
    <div className={cn(
      "group flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-slate-50",
      status && "opacity-50"
    )}>
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium text-slate-700">
          {member.full_name}
        </span>
        <Badge
          variant="outline"
          className={cn("text-[11px] py-0 px-1.5", roleBadgeStyle(member.member_role))}
        >
          {member.member_role}
        </Badge>
        {status && (
          <span className={cn(
            "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            STATUS_COLORS[status] || "bg-slate-100 text-slate-500 border-slate-300"
          )}>
            {status}
          </span>
        )}
      </div>
      <button
        onClick={() => onEdit(member)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-white hover:text-[#135bec] group-hover:opacity-100"
        title="멤버 편집"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

// ── Team Section Component ──

function TeamSection({
  team,
  onEditTeam,
  onDeleteTeam,
  onEditMember,
  statusMap,
}: {
  team: OrgTeam;
  onEditTeam: (team: OrgTeam) => void;
  onDeleteTeam: (team: OrgTeam) => void;
  onEditMember: (member: OrgMember) => void;
  statusMap?: Map<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const members = useMemo(() => {
    const raw = team.members || [];
    const roleOrder: Record<string, number> = { 본부장: 0, 팀장: 1, 팀원: 2 };
    return [...raw].sort(
      (a, b) => (roleOrder[a.member_role] ?? 9) - (roleOrder[b.member_role] ?? 9),
    );
  }, [team.members]);

  return (
    <div className="rounded-xl border border-slate-100 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <span className="text-sm font-semibold text-slate-800">
            {team.name}
          </span>
          <Badge
            variant="secondary"
            className="text-[11px] py-0 px-1.5 bg-slate-100 text-slate-500"
          >
            {members.length}명
          </Badge>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditTeam(team)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#135bec]"
            title="팀 편집"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDeleteTeam(team)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="팀 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isOpen && members.length > 0 && (
        <div className="border-t border-slate-50 px-3 py-2">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              onEdit={onEditMember}
              status={statusMap?.get(member.id)}
            />
          ))}
        </div>
      )}

      {isOpen && members.length === 0 && (
        <div className="border-t border-slate-50 px-4 py-4 text-center text-sm text-slate-400">
          소속 멤버가 없습니다
        </div>
      )}
    </div>
  );
}

// ── Division Section Component ──

function DivisionSection({
  division,
  onEditDivision,
  onDeleteDivision,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onEditMember,
  statusMap,
}: {
  division: OrgDivision;
  onEditDivision: (division: OrgDivision) => void;
  onDeleteDivision: (division: OrgDivision) => void;
  onAddTeam: (divisionId: string) => void;
  onEditTeam: (team: OrgTeam) => void;
  onDeleteTeam: (team: OrgTeam) => void;
  onEditMember: (member: OrgMember) => void;
  statusMap?: Map<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const teams = division.teams || [];

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-1 items-center gap-2.5 text-left"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-[#135bec]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#135bec]" />
          )}
          <Building2 className="h-4.5 w-4.5 text-[#135bec]" />
          <span className="text-base font-bold text-slate-900">
            {division.name}
          </span>
          <Badge
            variant="secondary"
            className="text-xs py-0 px-2 bg-[#135bec]/10 text-[#135bec]"
          >
            {teams.length}개 팀
          </Badge>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddTeam(division.id)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#135bec] transition-colors hover:bg-[#135bec]/10"
            title="팀 추가"
          >
            <Plus className="h-3.5 w-3.5" />
            팀 추가
          </button>
          <button
            onClick={() => onEditDivision(division)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#135bec]"
            title="본부 편집"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDeleteDivision(division)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="본부 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-2 p-4">
          {teams.length > 0 ? (
            teams.map((team) => (
              <TeamSection
                key={team.id}
                team={team}
                onEditTeam={onEditTeam}
                onDeleteTeam={onDeleteTeam}
                onEditMember={onEditMember}
                statusMap={statusMap}
              />
            ))
          ) : (
            <div className="py-6 text-center text-sm text-slate-400">
              소속 팀이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Unassigned Member Checkbox Row Component ──

const UnassignedMemberRow = memo(function UnassignedMemberRow({
  member,
  checked,
  onToggle,
  status,
}: {
  member: OrgMember;
  checked: boolean;
  onToggle: (id: string) => void;
  status?: string;
}) {
  return (
    <label className={cn(
      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-orange-50/50",
      status && "opacity-50"
    )}>
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggle(member.id)}
      />
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-400">
        <User className="h-3.5 w-3.5" />
      </div>
      <span className="text-sm font-medium text-slate-700">
        {member.full_name}
      </span>
      <Badge
        variant="outline"
        className={cn("text-[11px] py-0 px-1.5", roleBadgeStyle(member.member_role))}
      >
        {member.member_role}
      </Badge>
      {status && (
        <span className={cn(
          "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
          STATUS_COLORS[status] || "bg-slate-100 text-slate-500 border-slate-300"
        )}>
          {status}
        </span>
      )}
    </label>
  );
});

// ── Main Page Component ──

export default function OrganizationPage() {
  const { data: orgTree, isLoading } = useOrganizationTree(null);

  // 특이사항 인원 조회
  const { data: activeStatusMembers } = useActiveStatusMembers();
  const statusMap = useMemo(() => {
    const map = new Map<string, string>();
    activeStatusMembers?.forEach((m) => {
      if (m.member_id && m.current_status) {
        map.set(m.member_id, m.current_status);
      }
    });
    return map;
  }, [activeStatusMembers]);

  // Mutations
  const createDivisionMutation = useCreateDivision();
  const updateDivisionMutation = useUpdateDivision();
  const deleteDivisionMutation = useDeleteDivision();
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const updateMemberOrgMutation = useUpdateMemberOrg();
  const batchAssignMutation = useBatchAssignMembers();

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [formName, setFormName] = useState("");
  const [formDivisionId, setFormDivisionId] = useState<string>("");
  const [formTeamId, setFormTeamId] = useState<string>("");
  const [formRole, setFormRole] = useState<string>("");

  // Batch assignment state
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [batchTeamId, setBatchTeamId] = useState<string>("");

  // Derived data
  const divisions = orgTree?.divisions || [];
  const unassignedMembers = orgTree?.unassignedMembers || [];
  const directTeams = useMemo(() => {
    // teams that belong to the org but not to any division
    if (!orgTree?.teams) return [];
    return orgTree.teams.filter((t) => !t.division_id);
  }, [orgTree?.teams]);

  // All teams flattened (for member team assignment select)
  const allTeams = useMemo(() => {
    const teams: OrgTeam[] = [];
    divisions.forEach((div) => {
      (div.teams || []).forEach((t) => teams.push(t));
    });
    directTeams.forEach((t) => teams.push(t));
    return teams;
  }, [divisions, directTeams]);

  // Stats
  const totalDivisions = divisions.length;
  const totalTeams = allTeams.length;
  const totalMembers = useMemo(() => {
    let count = 0;
    allTeams.forEach((t) => {
      count += (t.members || []).length;
    });
    return count + unassignedMembers.length;
  }, [allTeams, unassignedMembers]);

  // ── Dialog Handlers ──

  const openDialog = (mode: DialogMode) => {
    setDialogMode(mode);
    switch (mode.type) {
      case "createDivision":
        setFormName("");
        break;
      case "editDivision":
        setFormName(mode.division.name);
        break;
      case "createTeam":
        setFormName("");
        setFormDivisionId(mode.divisionId || "");
        break;
      case "editTeam":
        setFormName(mode.team.name);
        setFormDivisionId(mode.team.division_id || "");
        break;
      case "editMember":
        setFormTeamId(mode.member.team_id || "");
        setFormRole(mode.member.member_role || "팀원");
        break;
    }
  };

  const closeDialog = () => {
    setDialogMode(null);
    setFormName("");
    setFormDivisionId("");
    setFormTeamId("");
    setFormRole("");
  };

  const handleSubmitDialog = () => {
    if (!dialogMode || !orgTree) return;

    switch (dialogMode.type) {
      case "createDivision":
        if (!formName.trim()) {
          toast.error("본부 이름을 입력해주세요.");
          return;
        }
        createDivisionMutation.mutate(
          { name: formName.trim(), organization_id: orgTree.id },
          { onSuccess: closeDialog }
        );
        break;

      case "editDivision":
        if (!formName.trim()) {
          toast.error("본부 이름을 입력해주세요.");
          return;
        }
        updateDivisionMutation.mutate(
          { id: dialogMode.division.id, name: formName.trim() },
          { onSuccess: closeDialog }
        );
        break;

      case "createTeam": {
        if (!formName.trim()) {
          toast.error("팀 이름을 입력해주세요.");
          return;
        }
        const createDivId = formDivisionId && formDivisionId !== "none" ? formDivisionId : null;
        createTeamMutation.mutate(
          {
            name: formName.trim(),
            organization_id: orgTree.id,
            division_id: createDivId,
          },
          { onSuccess: closeDialog }
        );
        break;
      }

      case "editTeam": {
        if (!formName.trim()) {
          toast.error("팀 이름을 입력해주세요.");
          return;
        }
        const editDivId = formDivisionId && formDivisionId !== "none" ? formDivisionId : null;
        updateTeamMutation.mutate(
          {
            id: dialogMode.team.id,
            name: formName.trim(),
            division_id: editDivId,
          },
          { onSuccess: closeDialog }
        );
        break;
      }

      case "editMember": {
        const editTeamId = formTeamId && formTeamId !== "none" ? formTeamId : null;
        updateMemberOrgMutation.mutate(
          {
            id: dialogMode.member.id,
            team_id: editTeamId,
            member_role: (formRole as "본부장" | "팀장" | "팀원") || "팀원",
          },
          { onSuccess: closeDialog }
        );
        break;
      }
    }
  };

  const handleDeleteDivision = (division: OrgDivision) => {
    const teamCount = (division.teams || []).length;
    const message = teamCount > 0
      ? `"${division.name}" 본부에 ${teamCount}개의 팀이 있습니다.\n삭제하시겠습니까?`
      : `"${division.name}" 본부를 삭제하시겠습니까?`;

    if (window.confirm(message)) {
      deleteDivisionMutation.mutate(division.id);
    }
  };

  const handleDeleteTeam = (team: OrgTeam) => {
    const memberCount = (team.members || []).length;
    const message = memberCount > 0
      ? `"${team.name}" 팀에 ${memberCount}명의 멤버가 있습니다.\n삭제하시겠습니까?`
      : `"${team.name}" 팀을 삭제하시겠습니까?`;

    if (window.confirm(message)) {
      deleteTeamMutation.mutate(team.id);
    }
  };

  // ── Batch assignment handlers ──

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllMembers = () => {
    if (selectedMemberIds.size === unassignedMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(unassignedMembers.map((m) => m.id)));
    }
  };

  const handleBatchAssign = () => {
    if (selectedMemberIds.size === 0) {
      toast.error("배정할 멤버를 선택해주세요.");
      return;
    }
    if (!batchTeamId || batchTeamId === "none") {
      toast.error("배정할 팀을 선택해주세요.");
      return;
    }
    batchAssignMutation.mutate(
      { memberIds: Array.from(selectedMemberIds), team_id: batchTeamId },
      {
        onSuccess: () => {
          setSelectedMemberIds(new Set());
          setBatchTeamId("");
        },
      }
    );
  };

  // ── Check if any mutation is pending ──
  const isDialogSubmitting =
    createDivisionMutation.isPending ||
    updateDivisionMutation.isPending ||
    createTeamMutation.isPending ||
    updateTeamMutation.isPending ||
    updateMemberOrgMutation.isPending;

  // ── Dialog title/description ──
  const dialogTitle = (() => {
    if (!dialogMode) return "";
    switch (dialogMode.type) {
      case "createDivision":
        return "본부 추가";
      case "editDivision":
        return "본부 편집";
      case "createTeam":
        return "팀 추가";
      case "editTeam":
        return "팀 편집";
      case "editMember":
        return "멤버 소속/역할 편집";
    }
  })();

  const dialogDescription = (() => {
    if (!dialogMode) return "";
    switch (dialogMode.type) {
      case "createDivision":
        return "새 본부의 이름을 입력하세요.";
      case "editDivision":
        return "본부 이름을 수정합니다.";
      case "createTeam":
        return "새 팀의 이름과 소속 본부를 선택하세요.";
      case "editTeam":
        return "팀 이름과 소속 본부를 수정합니다.";
      case "editMember":
        return `${dialogMode.member.full_name}님의 소속 팀과 역할을 변경합니다.`;
    }
  })();

  return (
    <div className="space-y-6">
      {/* Quick Stats + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>본부 <strong className="text-slate-800">{totalDivisions}</strong></span>
          <span className="text-slate-300">|</span>
          <span>팀 <strong className="text-slate-800">{totalTeams}</strong></span>
          <span className="text-slate-300">|</span>
          <span>멤버 <strong className="text-slate-800">{totalMembers}</strong></span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => openDialog({ type: "createDivision" })}
            size="sm"
            className="gap-1.5"
            disabled={!orgTree}
          >
            <Plus className="h-4 w-4" />
            본부 추가
          </Button>
          <Button
            onClick={() => openDialog({ type: "createTeam" })}
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!orgTree}
          >
            <Plus className="h-4 w-4" />
            팀 추가
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#135bec]" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !orgTree && (
        <div className="glass-panel rounded-2xl py-16 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-600">
            등록된 조직이 없습니다
          </p>
          <p className="mt-1 text-sm text-slate-400">
            먼저 조직을 생성해주세요
          </p>
        </div>
      )}

      {/* Organization Tree */}
      {!isLoading && orgTree && (
        <div className="space-y-4">
          {/* Divisions */}
          {divisions.map((division) => (
            <DivisionSection
              key={division.id}
              division={division}
              onEditDivision={(d) => openDialog({ type: "editDivision", division: d })}
              onDeleteDivision={handleDeleteDivision}
              onAddTeam={(divisionId) =>
                openDialog({ type: "createTeam", divisionId })
              }
              onEditTeam={(t) => openDialog({ type: "editTeam", team: t })}
              onDeleteTeam={handleDeleteTeam}
              onEditMember={(m) => openDialog({ type: "editMember", member: m })}
              statusMap={statusMap}
            />
          ))}

          {/* Direct Teams + Unassigned Members (50/50 layout) */}
          {(directTeams.length > 0 || unassignedMembers.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Direct Teams */}
              <div className="glass-panel overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <FolderTree className="h-4.5 w-4.5 text-slate-400" />
                    <span className="text-base font-bold text-slate-700">
                      직속 팀
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-xs py-0 px-2 bg-slate-100 text-slate-500"
                    >
                      {directTeams.length}개 팀
                    </Badge>
                  </div>
                  <button
                    onClick={() => openDialog({ type: "createTeam" })}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#135bec] transition-colors hover:bg-[#135bec]/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    팀 추가
                  </button>
                </div>
                <div className="space-y-2 p-4">
                  {directTeams.length > 0 ? (
                    directTeams.map((team) => (
                      <TeamSection
                        key={team.id}
                        team={team}
                        onEditTeam={(t) => openDialog({ type: "editTeam", team: t })}
                        onDeleteTeam={handleDeleteTeam}
                        onEditMember={(m) =>
                          openDialog({ type: "editMember", member: m })
                        }
                        statusMap={statusMap}
                      />
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-400">
                      직속 팀이 없습니다
                    </div>
                  )}
                </div>
              </div>

              {/* Unassigned Members */}
              <div className="glass-panel flex flex-col overflow-hidden rounded-2xl border-orange-200/50">
                <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <UserX className="h-4.5 w-4.5 text-orange-500" />
                    <span className="text-base font-bold text-slate-800">
                      미배정 멤버
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-xs py-0 px-2 bg-orange-50 text-orange-600 border-orange-200"
                    >
                      {unassignedMembers.length}명
                    </Badge>
                  </div>
                  {unassignedMembers.length > 0 && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
                      <Checkbox
                        checked={
                          selectedMemberIds.size === unassignedMembers.length &&
                          unassignedMembers.length > 0
                        }
                        onCheckedChange={toggleAllMembers}
                      />
                      전체 선택
                    </label>
                  )}
                </div>

                {unassignedMembers.length > 0 ? (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      {unassignedMembers.map((member) => (
                        <UnassignedMemberRow
                          key={member.id}
                          member={member}
                          checked={selectedMemberIds.has(member.id)}
                          onToggle={toggleMember}
                          status={statusMap.get(member.id)}
                        />
                      ))}
                    </div>

                    {/* Batch assign bar */}
                    {selectedMemberIds.size > 0 && (
                      <div className="flex items-center gap-2 border-t border-orange-100 bg-orange-50/50 px-4 py-3">
                        <span className="shrink-0 text-xs font-medium text-orange-700">
                          {selectedMemberIds.size}명 선택
                        </span>
                        <Select value={batchTeamId} onValueChange={setBatchTeamId}>
                          <SelectTrigger className="h-8 flex-1 text-xs">
                            <SelectValue placeholder="배정할 팀 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {allTeams.map((team) => {
                              const divName = divisions.find(
                                (d) => d.id === team.division_id
                              )?.name;
                              return (
                                <SelectItem key={team.id} value={team.id}>
                                  {divName ? `${divName} > ` : ""}
                                  {team.name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8 shrink-0 text-xs"
                          onClick={handleBatchAssign}
                          disabled={batchAssignMutation.isPending}
                        >
                          {batchAssignMutation.isPending ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          배정
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                    모든 멤버가 팀에 배정되었습니다
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name field for division/team */}
            {dialogMode &&
              (dialogMode.type === "createDivision" ||
                dialogMode.type === "editDivision" ||
                dialogMode.type === "createTeam" ||
                dialogMode.type === "editTeam") && (
                <div className="space-y-2">
                  <Label htmlFor="org-name">이름</Label>
                  <Input
                    id="org-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={
                      dialogMode.type.includes("Division")
                        ? "본부 이름"
                        : "팀 이름"
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitDialog();
                    }}
                    autoFocus
                  />
                </div>
              )}

            {/* Division select for team creation/edit */}
            {dialogMode &&
              (dialogMode.type === "createTeam" ||
                dialogMode.type === "editTeam") && (
                <div className="space-y-2">
                  <Label>소속 본부 (선택)</Label>
                  <Select
                    value={formDivisionId}
                    onValueChange={setFormDivisionId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="직속 (본부 없음)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">직속 (본부 없음)</SelectItem>
                      {divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id}>
                          {div.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {/* Team and role select for member edit */}
            {dialogMode && dialogMode.type === "editMember" && (
              <>
                <div className="space-y-2">
                  <Label>소속 팀</Label>
                  <Select value={formTeamId} onValueChange={setFormTeamId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="팀 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">소속 없음</SelectItem>
                      {allTeams.map((team) => {
                        const divName = divisions.find(
                          (d) => d.id === team.division_id
                        )?.name;
                        return (
                          <SelectItem key={team.id} value={team.id}>
                            {divName ? `${divName} > ` : ""}
                            {team.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>역할</Label>
                  <Select value={formRole} onValueChange={setFormRole}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="역할 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="팀원">팀원</SelectItem>
                      <SelectItem value="팀장">팀장</SelectItem>
                      <SelectItem value="본부장">본부장</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              취소
            </Button>
            <Button onClick={handleSubmitDialog} disabled={isDialogSubmitting}>
              {isDialogSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : dialogMode?.type.startsWith("create") ? (
                "추가"
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
