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
      type: "moveTeam";
      teamId: string;
      teamName: string;
      targetDivisionId: string | null;
      targetDivisionName: string;
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
const TEAM_NODE_HEIGHT = 70;
const MEMBER_NODE_HEIGHT = 52;
const NODE_HEIGHTS: Record<string, number> = {
  org: 56,
  ceo: 64,
  division: 48,
  team: TEAM_NODE_HEIGHT,
  member: MEMBER_NODE_HEIGHT,
  memberRank: 1,
  unassignedGroup: 40,
};
const RANK_SEP = 54;
const NODE_SEP = 18;
const TEAM_MEMBER_GAP = 24;
const MEMBER_RANK_SEP = 14;
const MEMBER_COLUMN_GAP = 16;

const POSITION_ORDER: Record<string, number> = {
  수석: 0,
  책임: 1,
  선임: 2,
  위원: 3,
  인턴: 4,
};

// ── Dagre auto-layout ──

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 28,
    marginy: 28,
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

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const w = NODE_WIDTH;
    const h = NODE_HEIGHTS[node.type || "member"] || 52;
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
      style: { ...node.style, width: w },
    };
  });

  return {
    nodes: alignTeamMembers(alignSingleChildSubtrees(layoutedNodes, edges)),
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

function applyEdgeTypes(edges: Edge[]) {
  const outgoingCounts = new Map<string, number>();

  for (const edge of edges) {
    outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) ?? 0) + 1);
  }

  return edges.map((edge) => ({
    ...edge,
    type: outgoingCounts.get(edge.source) === 1 ? "straight" : "smoothstep",
  }));
}

function alignSingleChildSubtrees(nodes: Node[], edges: Edge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const childIdsBySource = new Map<string, string[]>();
  const incomingCounts = new Map<string, number>();

  for (const edge of edges) {
    childIdsBySource.set(edge.source, [
      ...(childIdsBySource.get(edge.source) ?? []),
      edge.target,
    ]);
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  }

  const moveSubtree = (
    nodeId: string,
    deltaX: number,
    visited = new Set<string>()
  ) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    node.position = {
      ...node.position,
      x: node.position.x + deltaX,
    };

    for (const childId of childIdsBySource.get(nodeId) ?? []) {
      if ((incomingCounts.get(childId) ?? 0) > 1) continue;
      moveSubtree(childId, deltaX, visited);
    }
  };

  const straightEdges = edges
    .filter((edge) => edge.type === "straight")
    .sort((a, b) => {
      const sourceA = nodeMap.get(a.source);
      const sourceB = nodeMap.get(b.source);
      return (sourceA?.position.y ?? 0) - (sourceB?.position.y ?? 0);
    });

  for (const edge of straightEdges) {
    if ((incomingCounts.get(edge.target) ?? 0) > 1) continue;

    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;

    const deltaX = source.position.x - target.position.x;
    if (Math.abs(deltaX) < 1) continue;
    moveSubtree(edge.target, deltaX);
  }

  return nodes;
}

function alignTeamMembers(nodes: Node[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const rankNodes = nodes
    .filter((node) => node.type === "memberRank")
    .sort((a, b) => {
      const teamA = String((a.data as { teamId?: string }).teamId ?? "");
      const teamB = String((b.data as { teamId?: string }).teamId ?? "");
      const teamCompare = teamA.localeCompare(teamB);
      if (teamCompare !== 0) return teamCompare;
      return (
        Number((a.data as { order?: number }).order ?? 0) -
        Number((b.data as { order?: number }).order ?? 0)
      );
    });

  for (const rankNode of rankNodes) {
    const data = rankNode.data as {
      memberIds?: string[];
      row?: number;
      teamId?: string;
    };
    const teamNode = data.teamId ? nodeMap.get(data.teamId) : null;
    if (!teamNode) continue;

    const row = data.row ?? 0;
    rankNode.position = {
      ...rankNode.position,
      x: teamNode.position.x + NODE_WIDTH / 2,
      y:
        teamNode.position.y +
        TEAM_NODE_HEIGHT +
        TEAM_MEMBER_GAP +
        row * (MEMBER_NODE_HEIGHT + MEMBER_RANK_SEP),
    };

    const memberIds = data.memberIds ?? [];
    const visibleMembers = memberIds
      .map((id) => nodeMap.get(id))
      .filter((node): node is Node => Boolean(node));
    const totalWidth =
      visibleMembers.length * NODE_WIDTH +
      Math.max(visibleMembers.length - 1, 0) * MEMBER_COLUMN_GAP;
    const startX = teamNode.position.x + NODE_WIDTH / 2 - totalWidth / 2;

    visibleMembers.forEach((memberNode, index) => {
      memberNode.position = {
        ...memberNode.position,
        x: startX + index * (NODE_WIDTH + MEMBER_COLUMN_GAP),
        y: rankNode.position.y + MEMBER_RANK_SEP,
      };
    });
  }

  return nodes;
}

// ── Handle style (invisible) ──

const handleClass = "!w-2 !h-2 !border-0 !bg-slate-300";

// ── Custom Node Components ──

function OrgNode({ data }: { data: { label: string } }) {
  return (
    <div className="w-full rounded-lg bg-slate-800 px-5 py-2.5 text-center">
      <span className="text-sm font-semibold text-white">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

function CeoNode({ data }: { data: { label: string; sub: string } }) {
  return (
    <div className="w-full rounded-lg bg-slate-700 px-4 py-2.5 text-center">
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="min-w-0">
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
        "w-full rounded-lg px-4 py-2 text-center",
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
  data: {
    label: string;
    count: number;
    pending?: boolean;
    leaderName?: string;
    leaderSub?: string;
  };
}) {
  return (
    <div
      className={cn(
        "w-full rounded-lg px-3.5 py-1.5 text-center",
        data.pending
          ? "bg-slate-100/60 outline-dashed outline-1 outline-slate-300"
          : "bg-slate-100"
      )}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div>
        <span className="text-[13px] font-medium text-slate-600">
          {data.label}
        </span>
        <span className="ml-1.5 text-xs text-slate-400">{data.count}명</span>
        {data.pending && (
          <span className="ml-1.5 text-[10px] text-slate-400">NEW</span>
        )}
      </div>
      {data.leaderName && (
        <div className="mt-1 border-t border-slate-200 pt-1">
          <p className="truncate text-[12px] font-semibold text-slate-700">
            {data.leaderName}
          </p>
          {data.leaderSub && (
            <p className="truncate text-[10px] text-slate-400">
              {data.leaderSub}
            </p>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

function MemberNode({
  data,
}: {
  data: { label: string; sub: string; pendingMove?: boolean };
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-center",
        data.pendingMove
          ? "bg-slate-100 outline-dashed outline-1 outline-blue-300"
          : "bg-slate-50"
      )}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
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
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

function UnassignedGroupNode({ data }: { data: { label: string } }) {
  return (
    <div className="w-full rounded-lg bg-slate-50 px-3 py-1.5 text-center outline-dashed outline-1 outline-slate-200">
      <Handle type="target" position={Position.Top} className={handleClass} />
      <span className="text-xs font-medium text-slate-400">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

function HiddenRankNode() {
  return <div className="h-px w-px" />;
}

const nodeTypes: NodeTypes = {
  org: OrgNode,
  ceo: CeoNode,
  division: DivisionNode,
  team: TeamNode,
  member: MemberNode,
  memberRank: HiddenRankNode,
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
  const movedMembersByTarget = new Map<string, OrgMember[]>();
  for (const c of pendingChanges) {
    if (c.type !== "moveMember") continue;

    const member = allMembers.find((m) => m.id === c.memberId);
    if (!member) continue;

    movedMembersByTarget.set(c.targetTeamId, [
      ...(movedMembersByTarget.get(c.targetTeamId) ?? []),
      member,
    ]);
  }
  const teamMoveTargets = new Map<string, string | null>();
  for (const c of pendingChanges) {
    if (c.type === "moveTeam") {
      teamMoveTargets.set(c.teamId, c.targetDivisionId);
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
    for (const team of (div.teams || []).filter(
      (t) => !teamMoveTargets.has(t.id)
    )) {
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
    for (const team of (div.teams || []).filter(
      (t) => !teamMoveTargets.has(t.id)
    )) {
      addTeamNodes(
        team,
        teamParent,
        nodes,
        edges,
        ceoExcludeId,
        pendingMoves,
        memberMoveTargets,
        movedMembersByTarget.get(team.id) ?? []
      );
    }
  }

  // Direct teams
  for (const team of (tree.teams || []).filter(
    (t) => !t.division_id && !teamMoveTargets.has(t.id)
  )) {
    addTeamNodes(
      team,
      parentId,
      nodes,
      edges,
      ceoExcludeId,
      pendingMoves,
      memberMoveTargets,
      movedMembersByTarget.get(team.id) ?? []
    );
  }

  // Moved teams
  for (const c of pendingChanges) {
    if (c.type !== "moveTeam") continue;

    const team = findTeam(tree, c.teamId);
    if (!team) continue;

    const teamParent = c.targetDivisionId
      ? `div-${c.targetDivisionId}`
      : parentId;
    addTeamNodes(
      team,
      teamParent,
      nodes,
      edges,
      ceoExcludeId,
      pendingMoves,
      memberMoveTargets,
      movedMembersByTarget.get(team.id) ?? [],
      pendingEdgeStyle
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

  return getLayoutedElements(nodes, applyEdgeTypes(edges));
}

function addTeamNodes(
  team: OrgTeam,
  parentNodeId: string,
  nodes: Node[],
  edges: Edge[],
  ceoExcludeId?: string,
  pendingMoves?: Set<string>,
  memberMoveTargets?: Map<string, string>,
  incomingMembers: OrgMember[] = [],
  edgeStyle: Edge["style"] = defaultEdgeStyle
) {
  const teamNodeId = `team-${team.id}`;
  const ownMembers = (team.members || [])
    .filter((m) => m.id !== ceoExcludeId)
    .filter((m) => {
      const targetTeamId = memberMoveTargets?.get(m.id);
      return !targetTeamId || targetTeamId === team.id;
    });
  const incoming = incomingMembers
    .filter((m) => m.id !== ceoExcludeId)
    .filter((m) => !ownMembers.some((own) => own.id === m.id));
  const members = [...ownMembers, ...incoming];
  const teamLeader = ownMembers.find(
    (m) => m.title?.name === "팀장" || m.member_role === "팀장"
  );
  const filteredMembers = ownMembers.filter(
    (m) =>
      m.id !== teamLeader?.id &&
      !nodes.some((n) => n.id === `member-${m.id}`)
  );
  const incomingDisplayMembers = incoming.filter(
    (m) => !nodes.some((n) => n.id === `member-${m.id}`)
  );

  nodes.push({
    id: teamNodeId,
    type: "team",
    position: { x: 0, y: 0 },
    data: {
      label: team.name,
      count: members.length,
      pending: false,
      leaderName: teamLeader?.full_name,
      leaderSub: teamLeader
        ? [teamLeader.position?.name, teamLeader.title?.name]
            .filter(Boolean)
            .join(" / ") || teamLeader.member_role
        : undefined,
    },
  });
  edges.push({
    id: `e-${parentNodeId}-${teamNodeId}`,
    source: parentNodeId,
    target: teamNodeId,
    style: edgeStyle,
  });

  const roleOrder: Record<string, number> = {
    대표: 0,
    본부장: 1,
    팀장: 2,
    팀원: 3,
    인턴: 4,
  };
  const sorted = [...filteredMembers].sort(
    (a, b) =>
      (POSITION_ORDER[a.position?.name ?? ""] ?? 99) -
        (POSITION_ORDER[b.position?.name ?? ""] ?? 99) ||
      (roleOrder[a.member_role] ?? 9) - (roleOrder[b.member_role] ?? 9) ||
      a.full_name.localeCompare(b.full_name, "ko")
  );
  const memberRows: OrgMember[][] = [];
  const membersByPosition = new Map<string, OrgMember[]>();

  for (const member of sorted) {
    const positionName = member.position?.name || "직급 없음";
    membersByPosition.set(positionName, [
      ...(membersByPosition.get(positionName) ?? []),
      member,
    ]);
  }

  for (const group of membersByPosition.values()) {
    for (let i = 0; i < group.length; i += 2) {
      memberRows.push(group.slice(i, i + 2));
    }
  }
  for (const incomingMember of incomingDisplayMembers) {
    memberRows.push([incomingMember]);
  }

  for (const [rowIndex, rowMembers] of memberRows.entries()) {
    const rankNodeId = `${teamNodeId}-member-rank-${rowIndex}`;
    const previousRowMembers = memberRows[rowIndex - 1] ?? [];
    nodes.push({
      id: rankNodeId,
      type: "memberRank",
      position: { x: 0, y: 0 },
      data: {
        teamId: teamNodeId,
        memberIds: rowMembers.map((m) => `member-${m.id}`),
        order: rowIndex,
        row: rowIndex,
      },
    });
    edges.push({
      id: `e-${teamNodeId}-${rankNodeId}`,
      source: teamNodeId,
      target: rankNodeId,
      style: { ...defaultEdgeStyle, opacity: 0 },
    });

    for (const [columnIndex, m] of rowMembers.entries()) {
      const mId = `member-${m.id}`;
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
          pendingMove: isPendingMove,
        },
      });

      if (isMovedAway) continue;
      edges.push({
        id: `e-${rankNodeId}-${mId}`,
        source: rankNodeId,
        target: mId,
        style: { ...defaultEdgeStyle, opacity: 0 },
      });

      const previousMember = previousRowMembers[columnIndex];
      const sourceNodeId = previousMember
        ? `member-${previousMember.id}`
        : teamNodeId;
      edges.push({
        id: `e-${sourceNodeId}-${mId}`,
        source: sourceNodeId,
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

function findTeam(tree: OrganizationTree, teamId: string) {
  for (const div of tree.divisions || []) {
    const team = (div.teams || []).find((t) => t.id === teamId);
    if (team) return team;
  }

  return (tree.teams || []).find((t) => t.id === teamId);
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

      // Division ↔ Team: move team under division
      if (
        sourceNode.type === "division" &&
        targetNode.type === "team"
      ) {
        const divisionId = sourceNode.id.replace(/^div-/, "");
        const teamId = targetNode.id.replace(/^team-/, "");
        const divisionName =
          (sourceNode.data as { label: string }).label || "";
        const teamName =
          (targetNode.data as { label: string }).label || "";

        if (teamId.startsWith("temp-")) {
          setPendingChanges((prev) =>
            prev.map((c) =>
              c.type === "addTeam" && c.tempId === teamId
                ? { ...c, parentDivisionId: divisionId }
                : c
            )
          );
          return;
        }

        setPendingChanges((prev) => [
          ...prev.filter(
            (c) => !(c.type === "moveTeam" && c.teamId === teamId)
          ),
          {
            type: "moveTeam",
            teamId,
            teamName,
            targetDivisionId: divisionId,
            targetDivisionName: divisionName,
          },
        ]);
        return;
      }

      if (
        sourceNode.type === "team" &&
        targetNode.type === "division"
      ) {
        const divisionId = targetNode.id.replace(/^div-/, "");
        const teamId = sourceNode.id.replace(/^team-/, "");
        const divisionName =
          (targetNode.data as { label: string }).label || "";
        const teamName =
          (sourceNode.data as { label: string }).label || "";

        if (teamId.startsWith("temp-")) {
          setPendingChanges((prev) =>
            prev.map((c) =>
              c.type === "addTeam" && c.tempId === teamId
                ? { ...c, parentDivisionId: divisionId }
                : c
            )
          );
          return;
        }

        setPendingChanges((prev) => [
          ...prev.filter(
            (c) => !(c.type === "moveTeam" && c.teamId === teamId)
          ),
          {
            type: "moveTeam",
            teamId,
            teamName,
            targetDivisionId: divisionId,
            targetDivisionName: divisionName,
          },
        ]);
        return;
      }

      // Team source → Member target: assign member to team
      if (
        sourceNode.type === "team" &&
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
        targetNode.type === "team"
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
        if (c.type !== "moveTeam") continue;
        const divisionId = c.targetDivisionId
          ? idMap[c.targetDivisionId] || c.targetDivisionId
          : null;
        const res = await fetch(`/api/teams/${c.teamId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: c.teamName,
            division_id: divisionId,
          }),
        });
        if (!res.ok) throw new Error("팀 이동 실패: " + c.teamName);
      }

      // 4. Move members
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
                  {c.type === "moveTeam" &&
                    `↳ ${c.teamName} → ${c.targetDivisionName}`}
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
