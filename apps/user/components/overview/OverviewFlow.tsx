"use client";

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import Link from "next/link";
import { useMemo } from "react";
import type { OverviewProject } from "@/lib/overview";

type OverviewNodeData = {
  label: string;
  caption?: string;
  href?: string;
  tone: "customer" | "affiliate" | "project" | "request";
};

const nodeTypes = {
  overview: OverviewNode,
};

const branchDistance = 320;
const verticalGap = 84;
const clusterGap = 140;

export function OverviewFlow({ projects }: { projects: OverviewProject[] }) {
  const { nodes, edges } = useMemo(() => buildGraph(projects), [projects]);

  if (projects.length === 0) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-[#f3f3f3] bg-white">
        <p className="text-sm text-slate-500">표시할 프로젝트가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-190px)] min-h-[620px] overflow-hidden rounded-xl border border-[#f3f3f3] bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.4}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={24} size={1} />
        <MiniMap
          pannable
          zoomable
          nodeColor="transparent"
          nodeStrokeColor="#cbd5e1"
          nodeStrokeWidth={2}
          className="!bg-white"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function buildGraph(projects: OverviewProject[]) {
  const nodes: Node<OverviewNodeData>[] = [];
  const edges: Edge[] = [];
  const edgeIds = new Set<string>();
  const clusterDiameter = branchDistance * 2 + 240;
  let cursorX = 0;

  for (const project of projects) {
    const customers = project.customer_names.length
      ? project.customer_names
      : ["고객사 미지정"];

    const centerX = cursorX + clusterDiameter / 2;
    const centerY = 0;
    const projectNodeId = `project:${project.id}`;

    nodes.push({
      id: projectNodeId,
      type: "overview",
      position: { x: centerX, y: centerY },
      data: {
        label: project.title,
        caption: [
          "프로젝트",
          project.status,
          project.due_date ? `마감 ${project.due_date}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/projects/${project.id}`,
        tone: "project",
      },
    });

    const half = Math.ceil(customers.length / 2);
    const right = customers.slice(0, half);
    const left = customers.slice(half);

    placeBranch({
      side: "right",
      list: right,
      project,
      centerX,
      centerY,
      nodes,
      edges,
      edgeIds,
      projectNodeId,
    });

    placeBranch({
      side: "left",
      list: left,
      project,
      centerX,
      centerY,
      nodes,
      edges,
      edgeIds,
      projectNodeId,
    });

    cursorX += clusterDiameter + clusterGap;
  }

  return { nodes, edges };
}

function placeBranch({
  side,
  list,
  project,
  centerX,
  centerY,
  nodes,
  edges,
  edgeIds,
  projectNodeId,
}: {
  side: "left" | "right";
  list: string[];
  project: OverviewProject;
  centerX: number;
  centerY: number;
  nodes: Node<OverviewNodeData>[];
  edges: Edge[];
  edgeIds: Set<string>;
  projectNodeId: string;
}) {
  if (list.length === 0) return;
  const direction = side === "right" ? 1 : -1;
  const x = centerX + direction * branchDistance;
  const startY = centerY - ((list.length - 1) * verticalGap) / 2;

  list.forEach((customer, index) => {
    const y = startY + index * verticalGap;
    const nodeId = `customer:${project.id}:${side}:${index}`;
    nodes.push({
      id: nodeId,
      type: "overview",
      position: { x, y },
      sourcePosition: side === "right" ? Position.Right : Position.Left,
      targetPosition: side === "right" ? Position.Left : Position.Right,
      data: {
        label: customer,
        caption: "고객사",
        tone: "customer",
      },
    });
    pushBranchEdge({
      edges,
      edgeIds,
      source: projectNodeId,
      sourceHandle: side === "right" ? "right" : "left",
      target: nodeId,
    });
  });
}

function pushBranchEdge({
  edges,
  edgeIds,
  source,
  sourceHandle,
  target,
}: {
  edges: Edge[];
  edgeIds: Set<string>;
  source: string;
  sourceHandle: string;
  target: string;
}) {
  const id = `branch:${source}:${sourceHandle}:${target}`;
  if (edgeIds.has(id)) return;
  edgeIds.add(id);
  edges.push({
    id,
    source,
    sourceHandle,
    target,
    type: "default",
    style: { stroke: "#d4d8de", strokeWidth: 1.25 },
  });
}

function OverviewNode({
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<OverviewNodeData>>) {
  const body = (
    <>
      <p className="line-clamp-2 text-sm font-medium leading-5">{data.label}</p>
      {data.caption && (
        <p className="mt-1 truncate text-xs text-slate-500">{data.caption}</p>
      )}
    </>
  );

  const toneClass =
    data.tone === "project"
      ? "border-[#111111] bg-[#111111] text-white shadow-sm"
      : data.tone === "customer"
        ? "border-[#cbd5e1] bg-white text-[#111111]"
        : data.tone === "affiliate"
          ? "border-[#e2e8f0] bg-[#fafafa] text-[#111111]"
          : "border-[#f3f3f3] bg-white text-[#111111]";

  const innerClass = `block w-[200px] rounded-xl border px-3 py-2.5 transition-colors hover:border-slate-400 ${toneClass}`;

  if (data.tone === "project") {
    return (
      <div className="relative">
        <Handle
          id="left"
          type="source"
          position={Position.Left}
          className="!h-0 !w-0 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0"
        />
        <Handle
          id="right"
          type="source"
          position={Position.Right}
          className="!h-0 !w-0 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0"
        />
        {data.href ? (
          <Link href={data.href} className={`${innerClass} cursor-pointer`}>
            {body}
          </Link>
        ) : (
          <div className={innerClass}>{body}</div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Handle
        type="target"
        position={targetPosition ?? Position.Top}
        className="!h-0 !w-0 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0"
      />
      {data.href ? (
        <Link href={data.href} className={`${innerClass} cursor-pointer`}>
          {body}
        </Link>
      ) : (
        <div className={innerClass}>{body}</div>
      )}
      <Handle
        type="source"
        position={sourcePosition ?? Position.Bottom}
        className="!h-0 !w-0 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0"
      />
    </div>
  );
}
