"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { OverviewProject } from "@/lib/overview";

type OverviewNodeData = {
  label: string;
  caption?: string;
  href?: string;
  tone: "customer" | "affiliate" | "project" | "request";
  status?: string;
  parties?: string[];
  dueDate?: string | null;
};

const nodeTypes = {
  overview: OverviewNode,
};

const requestColumnX = 420;
const requestVerticalGap = 84;
const clusterGap = 110;
const projectX = 40;
const projectNodeHeight = 96;
const requestNodeHeight = 64;

export function OverviewFlow({ projects }: { projects: OverviewProject[] }) {
  const { nodes, edges } = useMemo(() => buildGraph(projects), [projects]);
  const summary = useMemo(() => buildSummary(projects), [projects]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  if (projects.length === 0) {
    return (
      <div className="relative flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white">
        <div className="absolute right-4 top-4">
          <FlowSummaryPanel
            summary={summary}
            isExpanded={isSummaryExpanded}
            onToggle={() => setIsSummaryExpanded((value) => !value)}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#111111]">
            표시할 프로젝트가 없습니다.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            프로젝트가 등록되면 연결 구조가 이곳에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-260px)] min-h-[620px] overflow-hidden rounded-2xl border border-[#f3f3f3] bg-[#f8fafc]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.4}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        panOnScroll
        selectionOnDrag={false}
        zoomOnScroll
        className="h-full w-full cursor-grab bg-[#f8fafc] active:cursor-grabbing"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#cbd5e1"
          gap={24}
          size={1.4}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="absolute right-4 top-4 z-10">
        <FlowSummaryPanel
          summary={summary}
          isExpanded={isSummaryExpanded}
          onToggle={() => setIsSummaryExpanded((value) => !value)}
        />
      </div>
    </div>
  );
}

function buildSummary(projects: OverviewProject[]) {
  return {
    projects: projects.length,
    requests: projects.reduce(
      (total, project) => total + project.requests.length,
      0,
    ),
    customers: new Set(
      projects.flatMap((project) => project.customer_names),
    ).size,
  };
}

function FlowSummaryPanel({
  summary,
  isExpanded,
  onToggle,
}: {
  summary: ReturnType<typeof buildSummary>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="w-[260px] rounded-xl border border-[#f3f3f3] bg-white/95 px-3 py-3 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111111]">정보</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            프로젝트 연결 현황
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg border border-[#f3f3f3] px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-[#f9f9fa] hover:text-[#111111]"
        >
          {isExpanded ? "접기" : "펼치기"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-3 gap-2">
              <SummaryItem label="프로젝트" value={summary.projects} />
              <SummaryItem label="요청" value={summary.requests} />
              <SummaryItem label="고객사" value={summary.customers} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f9f9fa] px-2 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#111111]">
        {value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

function buildGraph(projects: OverviewProject[]) {
  const nodes: Node<OverviewNodeData>[] = [];
  const edges: Edge[] = [];
  const edgeIds = new Set<string>();
  let cursorY = 0;

  for (const project of projects) {
    const branchHeight = Math.max(
      Math.max(1, project.requests.length) * requestVerticalGap,
      180,
    );
    const centerY = cursorY + branchHeight / 2;
    const projectY = centerY - projectNodeHeight / 2;
    const projectNodeId = `project:${project.id}`;

    nodes.push({
      id: projectNodeId,
      type: "overview",
      position: { x: projectX, y: projectY },
      data: {
        label: project.title,
        status: project.status,
        parties: [
          ...(project.customer_names.length
            ? project.customer_names
            : ["고객사 미지정"]),
          ...project.affiliate_names,
        ],
        dueDate: project.due_date,
        href: `/projects/${project.id}`,
        tone: "project",
      },
    });

    placeProjectRequests({
      projectId: project.id,
      projectNodeId,
      requests: project.requests,
      centerY,
      nodes,
      edges,
      edgeIds,
    });

    cursorY += branchHeight + clusterGap;
  }

  return { nodes, edges };
}

function placeProjectRequests({
  projectId,
  projectNodeId,
  requests,
  centerY,
  nodes,
  edges,
  edgeIds,
}: {
  projectId: string;
  projectNodeId: string;
  requests: OverviewProject["requests"];
  centerY: number;
  nodes: Node<OverviewNodeData>[];
  edges: Edge[];
  edgeIds: Set<string>;
}) {
  if (requests.length === 0) return;

  const startY =
    centerY - ((requests.length - 1) * requestVerticalGap) / 2 - requestNodeHeight / 2;

  requests.forEach((request, index) => {
    const nodeId = `request:${projectId}:${request.id}`;

    nodes.push({
      id: nodeId,
      type: "overview",
      position: {
        x: requestColumnX,
        y: startY + index * requestVerticalGap,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: request.title,
        caption: [
          "요청",
          request.status,
          request.due_date ? `마감 ${request.due_date}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/requests/${request.id}`,
        tone: "request",
      },
    });

    pushBranchEdge({
      edges,
      edgeIds,
      source: projectNodeId,
      sourceHandle: "right",
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
  sourceHandle?: string;
  target: string;
}) {
  const id = `branch:${source}:${sourceHandle ?? "default"}:${target}`;
  if (edgeIds.has(id)) return;
  edgeIds.add(id);
  edges.push({
    id,
    source,
    ...(sourceHandle ? { sourceHandle } : {}),
    target,
    type: "smoothstep",
    style: { stroke: "#d4d8de", strokeWidth: 1.25 },
  });
}

function OverviewNode({
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<OverviewNodeData>>) {
  const isProject = data.tone === "project";
  const body = isProject ? (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-white">
          {data.label}
        </p>
        {data.status && (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold leading-5 text-[#111111]">
            {data.status}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white/85">
            {data.parties?.join(", ") || "고객사 미지정"}
          </p>
        </div>
        <p className="shrink-0 text-[11px] font-medium text-white/65">
          {data.dueDate ? `마감 ${data.dueDate}` : "마감일 없음"}
        </p>
      </div>
    </div>
  ) : (
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

  const widthClass = isProject ? "w-[300px]" : "w-[200px]";
  const heightClass = isProject ? "min-h-24" : "min-h-16";
  const paddingClass = isProject ? "px-4 py-3" : "px-3 py-2.5";
  const innerClass = `block ${widthClass} ${heightClass} rounded-xl border ${paddingClass} transition-colors hover:border-slate-400 ${toneClass}`;

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
