"use client";

import { useMemo } from "react";
import { Building2, User, Crown, Shield, Briefcase } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import type {
  OrganizationTree,
  OrgDivision,
  OrgTeam,
  OrgMember,
} from "@/hooks/useOrganizationTree";

interface OrgChartProps {
  tree: OrganizationTree;
}

function MemberCard({ member, isHead }: { member: OrgMember; isHead?: boolean }) {
  const positionName = member.position?.name || "";
  const titleName = member.title?.name || "";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors",
        isHead
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
          isHead ? "bg-blue-500" : "bg-slate-400"
        )}
      >
        {member.full_name.charAt(0)}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {member.full_name}
        </p>
        <p className="text-[11px] text-slate-500 truncate">
          {[positionName, titleName].filter(Boolean).join(" / ") || member.member_role}
        </p>
      </div>
    </div>
  );
}

function TeamNode({ team }: { team: OrgTeam }) {
  const { head, members } = useMemo(() => {
    const sorted = [...(team.members || [])];
    const roleOrder: Record<string, number> = { 본부장: 0, 팀장: 1, 팀원: 2, 인턴: 3 };
    sorted.sort(
      (a, b) => (roleOrder[a.member_role] ?? 9) - (roleOrder[b.member_role] ?? 9)
    );

    // 팀장이 있으면 head로 분리
    const headMember = sorted.find(
      (m) => m.title?.name === "팀장" || m.member_role === "팀장"
    );
    const rest = headMember ? sorted.filter((m) => m.id !== headMember.id) : sorted;

    return { head: headMember || null, members: rest };
  }, [team.members]);

  return (
    <div className="flex flex-col items-center">
      {/* Team Header */}
      <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
        <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-800">
          {team.name}
        </span>
        <span className="text-xs text-emerald-600">
          ({(team.members || []).length}명)
        </span>
      </div>

      {/* Connector */}
      {(head || members.length > 0) && (
        <div className="h-3 w-px bg-slate-300" />
      )}

      {/* Team Head */}
      {head && (
        <>
          <MemberCard member={head} isHead />
          {members.length > 0 && <div className="h-2 w-px bg-slate-300" />}
        </>
      )}

      {/* Members */}
      {members.length > 0 && (
        <div className="flex flex-col gap-1">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function DivisionNode({ division }: { division: OrgDivision }) {
  // 본부장 찾기
  const divisionHead = useMemo(() => {
    for (const team of division.teams || []) {
      const head = (team.members || []).find(
        (m) => m.title?.name === "본부장" || m.member_role === "본부장"
      );
      if (head) return head;
    }
    return null;
  }, [division.teams]);

  return (
    <div className="flex flex-col items-center">
      {/* Division Header */}
      <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2">
        <Shield className="h-4 w-4 text-violet-600" />
        <span className="text-sm font-bold text-violet-800">
          {division.name}
        </span>
      </div>

      {/* Division Head */}
      {divisionHead && (
        <>
          <div className="h-3 w-px bg-slate-300" />
          <MemberCard member={divisionHead} isHead />
        </>
      )}

      {/* Connector to teams */}
      {(division.teams || []).length > 0 && (
        <div className="h-4 w-px bg-slate-300" />
      )}

      {/* Teams row */}
      {(division.teams || []).length > 0 && (
        <div className="relative">
          {/* Horizontal connector line */}
          {(division.teams || []).length > 1 && (
            <div className="absolute left-1/2 top-0 h-px w-[calc(100%-80px)] -translate-x-1/2 bg-slate-300" />
          )}
          <div className="flex gap-6">
            {(division.teams || []).map((team) => (
              <div key={team.id} className="flex flex-col items-center">
                {(division.teams || []).length > 1 && (
                  <div className="h-3 w-px bg-slate-300" />
                )}
                <TeamNode team={team} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChart({ tree }: OrgChartProps) {
  // 대표 찾기 (전체 멤버 중 title='대표')
  const ceo = useMemo(() => {
    const allMembers: OrgMember[] = [];
    for (const div of tree.divisions || []) {
      for (const team of div.teams || []) {
        allMembers.push(...(team.members || []));
      }
    }
    for (const team of tree.teams || []) {
      allMembers.push(...(team.members || []));
    }
    allMembers.push(...(tree.unassignedMembers || []));

    return allMembers.find(
      (m) => m.title?.name === "대표" || m.position?.name === "대표"
    ) || null;
  }, [tree]);

  return (
    <div className="flex flex-col items-center overflow-x-auto py-8">
      {/* Organization */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-slate-50 px-5 py-3">
        <Building2 className="h-5 w-5 text-slate-600" />
        <span className="text-base font-bold text-slate-800">{tree.name}</span>
      </div>

      {/* CEO */}
      {ceo && (
        <>
          <div className="h-4 w-px bg-slate-300" />
          <div className="flex items-center gap-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
              {ceo.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">{ceo.full_name}</p>
              <p className="text-xs text-amber-700">
                {[ceo.position?.name, ceo.title?.name].filter(Boolean).join(" / ")}
              </p>
            </div>
            <Crown className="ml-1 h-4 w-4 text-amber-500" />
          </div>
        </>
      )}

      {/* Connector to divisions */}
      {(tree.divisions || []).length > 0 && (
        <div className="h-5 w-px bg-slate-300" />
      )}

      {/* Divisions */}
      {(tree.divisions || []).length > 0 && (
        <div className="relative">
          {(tree.divisions || []).length > 1 && (
            <div className="absolute left-1/2 top-0 h-px w-[calc(100%-120px)] -translate-x-1/2 bg-slate-300" />
          )}
          <div className="flex gap-10">
            {(tree.divisions || []).map((div) => (
              <div key={div.id} className="flex flex-col items-center">
                {(tree.divisions || []).length > 1 && (
                  <div className="h-4 w-px bg-slate-300" />
                )}
                <DivisionNode division={div} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct teams (no division) */}
      {(tree.teams || []).filter((t) => !t.division_id).length > 0 && (
        <>
          <div className="mt-6 h-4 w-px bg-slate-300" />
          <div className="flex gap-6">
            {(tree.teams || [])
              .filter((t) => !t.division_id)
              .map((team) => (
                <TeamNode key={team.id} team={team} />
              ))}
          </div>
        </>
      )}

      {/* Unassigned members */}
      {(tree.unassignedMembers || []).length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-center text-xs font-medium text-slate-400">
            미배정 인원
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {(tree.unassignedMembers || []).map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
