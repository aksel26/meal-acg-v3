"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type Connection,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "dagre";
import {
  Plus,
  Save,
  LayoutGrid,
  Loader2,
  UserPlus,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Dialog,
  DialogContent,
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
import { toast } from "@repo/ui/src/sonner";
import type {
  OrganizationTree,
  OrgDivision,
  OrgTeam,
  OrgMember,
} from "@/hooks/useOrganizationTree";

// ── Types ──

type PendingChange =
  | { type: "addDivision"; tempId: string; name: string }
  | {
      type: "addTeam";
      tempId: string;
      name: string;
      parentDivisionId: string | null;
    }
  | {
      type: "moveMember";
      memberId: string;
      memberName: string;
      targetTeamId: string;
      targetTeamName: string;
    };

type DialogMode =
  | { type: "addDivision" }
  | { type: "addTeam" }
  | { type: "assignMember" };

interface OrgChartProps {
  tree: OrganizationTree;
  organizationId: string;
  onSaved: () => void;
}

// ── Layout constants ──

const NODE_WIDTH = 220;
const NODE_HEIGHTS: Record<string, number> = {
  org: 56,
  ceo: 64,
  division: 48,
  team: 48,
  member: 52,
  unassignedGroup: 40,
};
const RANK_SEP = 80;
const NODE_SEP = 30;

// ── Dagre auto-layout ──

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHTS[node.type || "member"] || 52,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const pos = g.node(node.id);
      const w = NODE_WIDTH;
      const h = NODE_HEIGHTS[node.type || "member"] || 52;
      return {
        ...node,
        position: { x: pos.x - w / 2, y: pos.y - h / 2 },
      };
    }),
    edges,
  };
}

// ── Edge style ──

const defaultEdgeStyle = { stroke: "#d1d5db", strokeWidth: 1 };
const pendingEdgeStyle = {
  stroke: "#94a3b8",
  strokeWidth: 1.5,
  strokeDasharray: "5,4",
};

// ── Handle style (invisible) ──

const handleClass = "!w-2 !h-2 !border-0 !bg-slate-300";

// ── Custom Node Components ──

function OrgNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-lg bg-slate-800 px-5 py-2.5">
      <span className="text-sm font-semibold text-white">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

function CeoNode({ data }: { data: { label: string; sub: string } }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-slate-700 px-4 py-2.5">
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
        {data.label.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{data.label}</p>
        {data.sub && (
          <p className="text-[11px] text-slate-300">{data.sub}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

function DivisionNode({
  data,
}: {
  data: { label: string; pending?: boolean };
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-2",
        data.pending
          ? "bg-slate-200/60 outline-dashed outline-1 outline-slate-400"
          : "bg-slate-200"
      )}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <span className="text-sm font-semibold text-slate-700">{data.label}</span>
      {data.pending && (
        <span className="ml-1.5 text-[10px] text-slate-400">NEW</span>
      )}
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

function TeamNode({
  data,
}: {
  data: { label: string; count: number; pending?: boolean };
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-3.5 py-1.5",
        data.pending
          ? "bg-slate-100/60 outline-dashed outline-1 outline-slate-300"
          : "bg-slate-100"
      )}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <span className="text-[13px] font-medium text-slate-600">
        {data.label}
      </span>
      <span className="ml-1.5 text-xs text-slate-400">{data.count}명</span>
      {data.pending && (
        <span className="ml-1.5 text-[10px] text-slate-400">NEW</span>
      )}
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

function MemberNode({
  data,
}: {
  data: { label: string; sub: string; isHead: boolean; pendingMove?: boolean };
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2",
        data.pendingMove
          ? "bg-slate-100 outline-dashed outline-1 outline-blue-300"
          : "bg-slate-50"
      )}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
          data.isHead ? "bg-slate-600" : "bg-slate-400"
        )}
      >
        {data.label.charAt(0)}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-800 truncate">
          {data.label}
        </p>
        {data.sub && (
          <p className="text-[11px] text-slate-400 truncate">{data.sub}</p>
        )}
      </div>
      {data.pendingMove && (
        <span className="text-[10px] text-slate-600 shrink-0">이동</span>
      )}
    </div>
  );
}

function UnassignedGroupNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-1.5 outline-dashed outline-1 outline-slate-200">
      <Handle type="target" position={Position.Top} className={handleClass} />
      <span className="text-xs font-medium text-slate-400">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  org: OrgNode,
  ceo: CeoNode,
  division: DivisionNode,
  team: TeamNode,
  member: MemberNode,
  unassignedGroup: UnassignedGroupNode,
};

// ── Graph builder ──

function buildGraph(
  tree: OrganizationTree,
  pendingChanges: PendingChange[]
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const orgId = `org-${tree.id}`;
  nodes.push({
    id: orgId,
    type: "org",
    position: { x: 0, y: 0 },
    data: { label: tree.name },
  });

  // Find CEO
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

  const ceo = allMembers.find(
    (m) => m.title?.name === "대표" || m.position?.name === "대표"
  );
  const ceoExcludeId = ceo?.id;

  // Collect pending member moves for visual state
  const pendingMoves = new Set(
    pendingChanges
      .filter((c) => c.type === "moveMember")
      .map((c) => (c as Extract<PendingChange, { type: "moveMember" }>).memberId)
  );
  const memberMoveTargets = new Map<string, string>();
  for (const c of pendingChanges) {
    if (c.type === "moveMember") {
      memberMoveTargets.set(c.memberId, c.targetTeamId);
    }
  }

  let parentId = orgId;

  if (ceo) {
    const ceoNodeId = `ceo-${ceo.id}`;
    nodes.push({
      id: ceoNodeId,
      type: "ceo",
      position: { x: 0, y: 0 },
      data: {
        label: ceo.full_name,
        sub:
          [ceo.position?.name, ceo.title?.name].filter(Boolean).join(" / ") ||
          "",
      },
    });
    edges.push({
      id: `e-${orgId}-${ceoNodeId}`,
      source: orgId,
      target: ceoNodeId,
      style: defaultEdgeStyle,
    });
    parentId = ceoNodeId;
  }

  // Divisions
  for (const div of tree.divisions || []) {
    const divNodeId = `div-${div.id}`;
    nodes.push({
      id: divNodeId,
      type: "division",
      position: { x: 0, y: 0 },
      data: { label: div.name, pending: false },
    });
    edges.push({
      id: `e-${parentId}-${divNodeId}`,
      source: parentId,
      target: divNodeId,
      style: defaultEdgeStyle,
    });

    // Division head
    let divHeadNodeId: string | null = null;
    for (const team of div.teams || []) {
      const head = (team.members || []).find(
        (m) =>
          m.id !== ceoExcludeId &&
          (m.title?.name === "본부장" || m.member_role === "본부장")
      );
      if (head && !pendingMoves.has(head.id)) {
        divHeadNodeId = `member-${head.id}`;
        nodes.push({
          id: divHeadNodeId,
          type: "member",
          position: { x: 0, y: 0 },
          data: {
            label: head.full_name,
            sub:
              [head.position?.name, head.title?.name]
                .filter(Boolean)
                .join(" / ") || head.member_role,
            isHead: true,
            pendingMove: false,
          },
        });
        edges.push({
          id: `e-${divNodeId}-${divHeadNodeId}`,
          source: divNodeId,
          target: divHeadNodeId,
          style: defaultEdgeStyle,
        });
        break;
      }
    }

    const teamParent = divHeadNodeId || divNodeId;
    for (const team of div.teams || []) {
      addTeamNodes(
        team,
        teamParent,
        nodes,
        edges,
        ceoExcludeId,
        pendingMoves,
        memberMoveTargets
      );
    }
  }

  // Direct teams
  for (const team of (tree.teams || []).filter((t) => !t.division_id)) {
    addTeamNodes(
      team,
      parentId,
      nodes,
      edges,
      ceoExcludeId,
      pendingMoves,
      memberMoveTargets
    );
  }

  // Pending divisions
  for (const c of pendingChanges) {
    if (c.type === "addDivision") {
      const divNodeId = `div-${c.tempId}`;
      nodes.push({
        id: divNodeId,
        type: "division",
        position: { x: 0, y: 0 },
        data: { label: c.name, pending: true },
      });
      edges.push({
        id: `e-${parentId}-${divNodeId}`,
        source: parentId,
        target: divNodeId,
        style: pendingEdgeStyle,
      });
    }
  }

  // Pending teams
  for (const c of pendingChanges) {
    if (c.type === "addTeam") {
      const teamNodeId = `team-${c.tempId}`;
      const teamParent = c.parentDivisionId
        ? `div-${c.parentDivisionId}`
        : parentId;
      nodes.push({
        id: teamNodeId,
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: c.name, count: 0, pending: true },
      });
      edges.push({
        id: `e-${teamParent}-${teamNodeId}`,
        source: teamParent,
        target: teamNodeId,
        style: pendingEdgeStyle,
      });
    }
  }

  // Pending member moves — add edges to new teams
  for (const c of pendingChanges) {
    if (c.type === "moveMember") {
      const mId = `member-${c.memberId}`;
      const targetId = `team-${c.targetTeamId}`;
      // Only add edge if both nodes exist
      if (nodes.some((n) => n.id === mId) && nodes.some((n) => n.id === targetId)) {
        edges.push({
          id: `e-pending-${targetId}-${mId}`,
          source: targetId,
          target: mId,
          style: pendingEdgeStyle,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        });
      }
    }
  }

  // Unassigned members (exclude moved ones)
  const unassigned = (tree.unassignedMembers || []).filter(
    (m) => m.id !== ceoExcludeId
  );
  if (unassigned.length > 0) {
    const groupId = "unassigned-group";
    nodes.push({
      id: groupId,
      type: "unassignedGroup",
      position: { x: 0, y: 0 },
      data: { label: `미배정 (${unassigned.length}명)` },
    });
    edges.push({
      id: `e-${parentId}-${groupId}`,
      source: parentId,
      target: groupId,
      style: { ...defaultEdgeStyle, strokeDasharray: "5,5" },
    });

    for (const m of unassigned) {
      const mId = `member-${m.id}`;
      if (nodes.some((n) => n.id === mId)) continue;
      const isPendingMove = pendingMoves.has(m.id);
      nodes.push({
        id: mId,
        type: "member",
        position: { x: 0, y: 0 },
        data: {
          label: m.full_name,
          sub:
            [m.position?.name, m.title?.name].filter(Boolean).join(" / ") ||
            m.member_role,
          isHead: false,
          pendingMove: isPendingMove,
        },
      });
      if (!isPendingMove) {
        edges.push({
          id: `e-${groupId}-${mId}`,
          source: groupId,
          target: mId,
          style: { ...defaultEdgeStyle, strokeDasharray: "5,5" },
        });
      }
    }
  }

  return getLayoutedElements(nodes, edges);
}

function addTeamNodes(
  team: OrgTeam,
  parentNodeId: string,
  nodes: Node[],
  edges: Edge[],
  ceoExcludeId?: string,
  pendingMoves?: Set<string>,
  memberMoveTargets?: Map<string, string>
) {
  const teamNodeId = `team-${team.id}`;
  const members = (team.members || []).filter((m) => m.id !== ceoExcludeId);
  const filteredMembers = members.filter(
    (m) => !nodes.some((n) => n.id === `member-${m.id}`)
  );

  nodes.push({
    id: teamNodeId,
    type: "team",
    position: { x: 0, y: 0 },
    data: { label: team.name, count: members.length, pending: false },
  });
  edges.push({
    id: `e-${parentNodeId}-${teamNodeId}`,
    source: parentNodeId,
    target: teamNodeId,
    style: defaultEdgeStyle,
  });

  const roleOrder: Record<string, number> = {
    본부장: 0,
    팀장: 1,
    팀원: 2,
    인턴: 3,
  };
  const sorted = [...filteredMembers].sort(
    (a, b) =>
      (roleOrder[a.member_role] ?? 9) - (roleOrder[b.member_role] ?? 9)
  );

  for (const m of sorted) {
    const mId = `member-${m.id}`;
    const isHead = m.title?.name === "팀장" || m.member_role === "팀장";
    const isPendingMove = pendingMoves?.has(m.id) ?? false;
    // If member is being moved elsewhere, show as pending but keep original edge
    const isMovedAway =
      isPendingMove && memberMoveTargets?.get(m.id) !== team.id;

    nodes.push({
      id: mId,
      type: "member",
      position: { x: 0, y: 0 },
      data: {
        label: m.full_name,
        sub:
          [m.position?.name, m.title?.name].filter(Boolean).join(" / ") ||
          m.member_role,
        isHead,
        pendingMove: isPendingMove,
      },
    });

    if (!isMovedAway) {
      edges.push({
        id: `e-${teamNodeId}-${mId}`,
        source: teamNodeId,
        target: mId,
        style: defaultEdgeStyle,
      });
    }
  }
}

// ── Helper: get all divisions (real + pending) ──

function getAllDivisions(
  tree: OrganizationTree,
  pendingChanges: PendingChange[]
): { id: string; name: string; pending: boolean }[] {
  const divs = (tree.divisions || []).map((d) => ({
    id: d.id,
    name: d.name,
    pending: false,
  }));
  for (const c of pendingChanges) {
    if (c.type === "addDivision") {
      divs.push({ id: c.tempId, name: c.name, pending: true });
    }
  }
  return divs;
}

function getAllTeams(
  tree: OrganizationTree,
  pendingChanges: PendingChange[]
): { id: string; name: string; pending: boolean }[] {
  const teams: { id: string; name: string; pending: boolean }[] = [];
  for (const div of tree.divisions || []) {
    for (const t of div.teams || []) {
      teams.push({ id: t.id, name: `${div.name} > ${t.name}`, pending: false });
    }
  }
  for (const t of (tree.teams || []).filter((t) => !t.division_id)) {
    teams.push({ id: t.id, name: t.name, pending: false });
  }
  for (const c of pendingChanges) {
    if (c.type === "addTeam") {
      teams.push({ id: c.tempId, name: c.name, pending: true });
    }
  }
  return teams;
}

// ── Main Component ──

let tempCounter = 0;
function genTempId() {
  return `temp-${Date.now()}-${++tempCounter}`;
}

export default function OrgChart({
  tree,
  organizationId,
  onSaved,
}: OrgChartProps) {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [formName, setFormName] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("none");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const reactFlowRef = useRef<{ fitView: () => void } | null>(null);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => buildGraph(tree, pendingChanges),
    [tree, pendingChanges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync when tree or pending changes update
  useMemo(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const hasPending = pendingChanges.length > 0;

  // ── Edge connection handler ──
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      // Team/Division source → Member target: assign member to team
      if (
        (sourceNode.type === "team" || sourceNode.type === "division") &&
        targetNode.type === "member"
      ) {
        const teamId = sourceNode.id.replace(/^team-/, "");
        const memberId = targetNode.id.replace(/^member-/, "");
        const memberName =
          (targetNode.data as { label: string }).label || "";
        const teamName =
          (sourceNode.data as { label: string }).label || "";

        // Remove existing pending move for this member
        setPendingChanges((prev) => [
          ...prev.filter(
            (c) => !(c.type === "moveMember" && c.memberId === memberId)
          ),
          {
            type: "moveMember",
            memberId,
            memberName,
            targetTeamId: teamId,
            targetTeamName: teamName,
          },
        ]);
        return;
      }

      // Member source → Team target: same as above (reverse direction)
      if (
        sourceNode.type === "member" &&
        (targetNode.type === "team" || targetNode.type === "division")
      ) {
        const teamId = targetNode.id.replace(/^team-/, "");
        const memberId = sourceNode.id.replace(/^member-/, "");
        const memberName =
          (sourceNode.data as { label: string }).label || "";
        const teamName =
          (targetNode.data as { label: string }).label || "";

        setPendingChanges((prev) => [
          ...prev.filter(
            (c) => !(c.type === "moveMember" && c.memberId === memberId)
          ),
          {
            type: "moveMember",
            memberId,
            memberName,
            targetTeamId: teamId,
            targetTeamName: teamName,
          },
        ]);
        return;
      }
    },
    [nodes]
  );

  // ── Dialog handlers ──

  function openDialog(mode: DialogMode) {
    setFormName("");
    setSelectedDivision("none");
    setSelectedTeam("");
    setSelectedMember("");
    setDialogMode(mode);
  }

  function handleDialogSubmit() {
    if (!dialogMode) return;

    if (dialogMode.type === "addDivision") {
      if (!formName.trim()) return;
      setPendingChanges((prev) => [
        ...prev,
        { type: "addDivision", tempId: genTempId(), name: formName.trim() },
      ]);
    } else if (dialogMode.type === "addTeam") {
      if (!formName.trim()) return;
      setPendingChanges((prev) => [
        ...prev,
        {
          type: "addTeam",
          tempId: genTempId(),
          name: formName.trim(),
          parentDivisionId:
            selectedDivision === "none" ? null : selectedDivision,
        },
      ]);
    } else if (dialogMode.type === "assignMember") {
      if (!selectedMember || !selectedTeam) return;
      const member = (tree.unassignedMembers || []).find(
        (m) => m.id === selectedMember
      );
      const allTeams = getAllTeams(tree, pendingChanges);
      const teamInfo = allTeams.find((t) => t.id === selectedTeam);
      if (member && teamInfo) {
        setPendingChanges((prev) => [
          ...prev.filter(
            (c) =>
              !(c.type === "moveMember" && c.memberId === selectedMember)
          ),
          {
            type: "moveMember",
            memberId: selectedMember,
            memberName: member.full_name,
            targetTeamId: selectedTeam,
            targetTeamName: teamInfo.name,
          },
        ]);
      }
    }

    setDialogMode(null);
  }

  // ── Save handler ──

  async function handleSave() {
    if (!hasPending) return;
    setIsSaving(true);

    try {
      const idMap: Record<string, string> = {};

      // 1. Create pending divisions
      for (const c of pendingChanges) {
        if (c.type !== "addDivision") continue;
        const res = await fetch("/api/divisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: c.name,
            organization_id: organizationId,
          }),
        });
        if (!res.ok) throw new Error("본부 생성 실패: " + c.name);
        const data = await res.json();
        idMap[c.tempId] = data.id;
      }

      // 2. Create pending teams
      for (const c of pendingChanges) {
        if (c.type !== "addTeam") continue;
        const divisionId = c.parentDivisionId
          ? idMap[c.parentDivisionId] || c.parentDivisionId
          : null;
        const res = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: c.name,
            organization_id: organizationId,
            division_id: divisionId,
          }),
        });
        if (!res.ok) throw new Error("팀 생성 실패: " + c.name);
        const data = await res.json();
        idMap[c.tempId] = data.id;
      }

      // 3. Move members
      for (const c of pendingChanges) {
        if (c.type !== "moveMember") continue;
        const teamId = idMap[c.targetTeamId] || c.targetTeamId;
        const res = await fetch(`/api/members/${c.memberId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_id: teamId }),
        });
        if (!res.ok) throw new Error("멤버 이동 실패: " + c.memberName);
      }

      setPendingChanges([]);
      toast.success("조직 변경사항이 저장되었습니다.");
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ── Auto layout ──

  function handleAutoLayout() {
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
    setNodes(ln);
    setEdges(le);
    setTimeout(() => reactFlowRef.current?.fitView(), 50);
  }

  // ── Undo last pending ──

  function handleUndoLast() {
    setPendingChanges((prev) => prev.slice(0, -1));
  }

  // ── Available data for dialogs ──

  const allDivisions = useMemo(
    () => getAllDivisions(tree, pendingChanges),
    [tree, pendingChanges]
  );
  const allTeams = useMemo(
    () => getAllTeams(tree, pendingChanges),
    [tree, pendingChanges]
  );
  const unassignedMembers = useMemo(
    () =>
      (tree.unassignedMembers || []).filter(
        (m) => m.title?.name !== "대표" && m.position?.name !== "대표"
      ),
    [tree]
  );

  const onInit = useCallback(
    (instance: { fitView: () => void }) => {
      reactFlowRef.current = instance;
      setTimeout(() => instance.fitView(), 50);
    },
    []
  );

  return (
    <div className="h-[650px] w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        minZoom={0.15}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: defaultEdgeStyle,
        }}
        connectionLineStyle={{ stroke: "#3b82f6", strokeWidth: 2 }}
      >
        <Background color="#e2e8f0" gap={20} size={1} />

        {/* Toolbar */}
        <Panel
          position="top-left"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur"
        >
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => openDialog({ type: "addDivision" })}
          >
            <Plus className="h-3.5 w-3.5" />
            본부
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => openDialog({ type: "addTeam" })}
          >
            <Plus className="h-3.5 w-3.5" />
            팀
          </Button>
          {unassignedMembers.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => openDialog({ type: "assignMember" })}
            >
              <UserPlus className="h-3.5 w-3.5" />
              팀원 배정
            </Button>
          )}

          <div className="mx-1 h-5 w-px bg-slate-200" />

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleAutoLayout}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            정렬
          </Button>

          {hasPending && (
            <>
              <div className="mx-1 h-5 w-px bg-slate-200" />

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-500"
                onClick={handleUndoLast}
              >
                실행취소
              </Button>

              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-slate-900 hover:bg-black text-white"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                저장 ({pendingChanges.length})
              </Button>
            </>
          )}
        </Panel>

        {/* Pending changes summary */}
        {hasPending && (
          <Panel
            position="bottom-left"
            className="max-w-xs rounded-lg border border-slate-300 bg-slate-100/95 px-3 py-2 shadow-sm backdrop-blur"
          >
            <p className="mb-1 text-xs font-semibold text-slate-900">
              대기 중인 변경 ({pendingChanges.length})
            </p>
            <ul className="space-y-0.5">
              {pendingChanges.map((c, i) => (
                <li key={i} className="text-[11px] text-slate-800">
                  {c.type === "addDivision" && `+ 본부: ${c.name}`}
                  {c.type === "addTeam" && `+ 팀: ${c.name}`}
                  {c.type === "moveMember" &&
                    `↳ ${c.memberName} → ${c.targetTeamName}`}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Controls
          showInteractive={false}
          className="!bg-white !border-slate-200 !shadow-sm [&>button]:!border-slate-200 [&>button]:!bg-white [&>button:hover]:!bg-slate-50"
        />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={(node) => {
            switch (node.type) {
              case "org":
                return "#1e293b";
              case "ceo":
                return "#334155";
              case "division":
                return "#e2e8f0";
              case "team":
                return "#f1f5f9";
              default:
                return "#ffffff";
            }
          }}
          className="!bg-slate-50 !border-slate-200"
        />
      </ReactFlow>

      {/* ── Dialogs ── */}

      {/* Add Division Dialog */}
      <Dialog
        open={dialogMode?.type === "addDivision"}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>본부 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="div-name">본부 이름</Label>
              <Input
                id="div-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 경영본부"
                onKeyDown={(e) => e.key === "Enter" && handleDialogSubmit()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogMode(null)}
            >
              취소
            </Button>
            <Button size="sm" onClick={handleDialogSubmit} disabled={!formName.trim()}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Dialog */}
      <Dialog
        open={dialogMode?.type === "addTeam"}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>팀 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="team-name">팀 이름</Label>
              <Input
                id="team-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 개발팀"
                onKeyDown={(e) => e.key === "Enter" && handleDialogSubmit()}
                autoFocus
              />
            </div>
            <div>
              <Label>소속 본부</Label>
              <Select
                value={selectedDivision}
                onValueChange={setSelectedDivision}
              >
                <SelectTrigger>
                  <SelectValue placeholder="본부 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음 (직속)</SelectItem>
                  {allDivisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.pending ? " (NEW)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogMode(null)}
            >
              취소
            </Button>
            <Button size="sm" onClick={handleDialogSubmit} disabled={!formName.trim()}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Member Dialog */}
      <Dialog
        open={dialogMode?.type === "assignMember"}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>팀원 배정</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>미배정 멤버</Label>
              <Select
                value={selectedMember}
                onValueChange={setSelectedMember}
              >
                <SelectTrigger>
                  <SelectValue placeholder="멤버 선택" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name} ({m.member_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>배정할 팀</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="팀 선택" />
                </SelectTrigger>
                <SelectContent>
                  {allTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.pending ? " (NEW)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogMode(null)}
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleDialogSubmit}
              disabled={!selectedMember || !selectedTeam}
            >
              배정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
