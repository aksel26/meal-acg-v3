"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  History,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { cn } from "@repo/ui/lib/utils";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent } from "@repo/ui/src/card";
import { Checkbox } from "@repo/ui/src/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/src/tooltip";
import { queryKeys } from "@/lib/query-keys";
import type { MemberCurrentStatus } from "@/lib/supabase/types";

type RoundStatus = "draft" | "confirmed" | "closed";
type QuestionType = "score" | "subjective";
type AssignmentSource = "auto_same_team" | "auto_leader" | "manual";

type EvaluationRound = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: RoundStatus;
  is_deployed: boolean;
  config_version: number;
  question_set_id: string | null;
  question_set_applied_at: string | null;
  created_at: string;
  updated_at: string;
};

type EvaluationQuestion = {
  id?: string;
  round_id?: string;
  position_id: string;
  question_type: QuestionType;
  prompt: string;
  weight: number | null;
  sort_order: number;
  is_required: boolean;
  position?: { id: string; name: string } | null;
};

type EvaluationSubject = {
  id: string;
  round_id: string;
  member_id: string;
  is_excluded: boolean;
  member?: {
    id: string;
    full_name: string;
    team_id: string | null;
    position_id: string | null;
    title_id: string | null;
  } | null;
};

type EvaluationAssignment = {
  id?: string;
  round_id?: string;
  subject_member_id: string;
  evaluator_member_id: string;
  source: AssignmentSource;
  is_excluded: boolean;
  excluded_reason?: string | null;
  subject?: { id: string; full_name: string } | null;
  evaluator?: { id: string; full_name: string } | null;
};

type EvaluationRoundDetail = EvaluationRound & {
  questions: EvaluationQuestion[];
  subjects: EvaluationSubject[];
  assignments: EvaluationAssignment[];
};

type EvaluationAuditLog = {
  id: string;
  action: string;
  target_table: string;
  created_at: string;
  actor_name?: string | null;
  actor?: { id: string; full_name: string } | null;
};

type ValidationResult = {
  valid: boolean;
  errors: string[];
  missingPositionIds: string[];
};

type MemberRow = MemberCurrentStatus & {
  member_id: string;
  full_name: string;
  position_id: string | null;
  position_name: string | null;
  title_name: string | null;
  team_name: string | null;
  current_status: string | null;
};

const EMPTY_MEMBERS: MemberRow[] = [];
const EMPTY_AUDIT_LOGS: EvaluationAuditLog[] = [];
const ALL_TEAMS_KEY = "__all__";
const NO_TEAM_KEY = "__none__";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "요청 처리에 실패했습니다.");
  }

  return payload as T;
}

function statusLabel(status: RoundStatus) {
  if (status === "confirmed") return "확정";
  if (status === "closed") return "종료";
  return "초안";
}

function sourceLabel(source: AssignmentSource) {
  if (source === "auto_leader") return "상위자";
  if (source === "auto_same_team") return "같은 팀";
  return "수동";
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_ROUND: "회차 생성",
  UPDATE_ROUND: "회차 정보 수정",
  DELETE_ROUND: "회차 삭제",
  REPLACE_SUBJECTS: "대상자 저장",
  REPLACE_QUESTIONS: "문항 저장",
  APPLY_QUESTION_SET: "문항 SET 적용",
  GENERATE_ASSIGNMENTS: "평가자 자동 생성",
  REPLACE_ASSIGNMENTS: "평가자 배정 저장",
  CONFIRM_ROUND: "회차 확정",
  DEPLOY_ROUND: "배포 ON",
  UNDEPLOY_ROUND: "배포 OFF",
};

const TARGET_LABELS: Record<string, string> = {
  multisource_evaluation_rounds: "회차",
  multisource_evaluation_subjects: "대상자",
  multisource_evaluation_questions: "문항",
  multisource_evaluation_question_sets: "문항 SET",
  multisource_evaluation_assignments: "평가자 배정",
  multisource_evaluation_audit_logs: "변경 이력",
};

const TITLE_SORT_ORDER = ["대표", "본부장", "팀장", "팀원"];

function titleSortRank(titleName?: string | null) {
  const title = titleName || "팀원";
  const index = TITLE_SORT_ORDER.findIndex((keyword) =>
    title.includes(keyword),
  );
  return index === -1 ? TITLE_SORT_ORDER.length : index;
}

function teamKey(teamName?: string | null) {
  return teamName?.trim() || NO_TEAM_KEY;
}

function teamLabel(key: string) {
  if (key === ALL_TEAMS_KEY) return "전체";
  if (key === NO_TEAM_KEY) return "팀 미지정";
  return key;
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action;
}

function targetLabel(target: string) {
  return TARGET_LABELS[target] || target;
}

export default function EvaluationDetailPage() {
  const { id: roundId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [roundForm, setRoundForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([]);
  const [selectedTeamKey, setSelectedTeamKey] = useState(ALL_TEAMS_KEY);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [evaluatorSearch, setEvaluatorSearch] = useState("");

  const { data: members = EMPTY_MEMBERS } = useQuery<MemberRow[]>({
    queryKey: queryKeys.memberStatuses.list({}),
    queryFn: async () => requestJson<MemberRow[]>("/api/member-statuses"),
    staleTime: 60 * 1000,
  });

  const { data: roundDetail, isFetching: detailFetching, isLoading } =
    useQuery<EvaluationRoundDetail>({
      queryKey: queryKeys.evaluations.round(roundId || ""),
      queryFn: async () =>
        requestJson<EvaluationRoundDetail>(`/api/evaluations/rounds/${roundId}`),
      enabled: !!roundId,
    });

  const { data: validation } = useQuery<ValidationResult>({
    queryKey: queryKeys.evaluations.validation(roundId || ""),
    queryFn: async () =>
      requestJson<ValidationResult>(
        `/api/evaluations/rounds/${roundId}/validate`,
      ),
    enabled: !!roundId,
  });

  const { data: auditLogs = EMPTY_AUDIT_LOGS } = useQuery<EvaluationAuditLog[]>({
    queryKey: queryKeys.evaluations.auditLogs(roundId || undefined),
    queryFn: async () =>
      requestJson<EvaluationAuditLog[]>(
        `/api/evaluations/audit-logs?roundId=${roundId}`,
      ),
    enabled: !!roundId,
  });

  useEffect(() => {
    if (!roundDetail) return;

    setRoundForm({
      name: roundDetail.name,
      description: roundDetail.description || "",
      startDate: roundDetail.start_date,
      endDate: roundDetail.end_date,
    });
    setQuestions(
      [...roundDetail.questions].sort((a, b) => a.sort_order - b.sort_order),
    );
    setSubjectIds(roundDetail.subjects.map((subject) => subject.member_id));
    setAssignments(roundDetail.assignments);
  }, [roundDetail]);

  useEffect(() => {
    if (members.length === 0) return;
    setSubjectIds((prev) => {
      const next = members.map((member) => member.member_id);
      if (
        prev.length === next.length &&
        prev.every((id, index) => id === next[index])
      ) {
        return prev;
      }
      return next;
    });
  }, [members]);

  const isLocked = Boolean(roundDetail?.is_deployed);
  const membersById = useMemo(
    () => new Map(members.map((member) => [member.member_id, member])),
    [members],
  );
  const teamOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      const key = teamKey(member.team_name);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const teams = Array.from(counts.entries())
      .map(([key, count]) => ({ key, label: teamLabel(key), count }))
      .sort((a, b) => a.label.localeCompare(b.label, "ko"));

    return [
      { key: ALL_TEAMS_KEY, label: "전체", count: members.length },
      ...teams,
    ];
  }, [members]);

  const selectedTeamMembers = useMemo(() => {
    const keyword = subjectSearch.trim().toLowerCase();
    const source = members.filter((member) => {
      if (
        selectedTeamKey !== ALL_TEAMS_KEY &&
        teamKey(member.team_name) !== selectedTeamKey
      ) {
        return false;
      }

      if (!keyword) return true;

      const fields = [
        member.full_name,
        member.team_name,
        member.position_name,
        member.title_name,
      ];
      return fields.some((field) => field?.toLowerCase().includes(keyword));
    });

    return [...source].sort((a, b) => {
      const titleDiff =
        titleSortRank(a.title_name) - titleSortRank(b.title_name);
      if (titleDiff !== 0) return titleDiff;
      return a.full_name.localeCompare(b.full_name, "ko");
    });
  }, [members, selectedTeamKey, subjectSearch]);

  useEffect(() => {
    if (
      selectedSubjectId &&
      selectedTeamMembers.some(
        (member) => member.member_id === selectedSubjectId,
      )
    ) {
      return;
    }

    setSelectedSubjectId(selectedTeamMembers[0]?.member_id || "");
  }, [selectedSubjectId, selectedTeamMembers]);

  const selectedSubject = selectedSubjectId
    ? membersById.get(selectedSubjectId)
    : undefined;
  const selectedSubjectAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignment.subject_member_id === selectedSubjectId &&
          !assignment.is_excluded,
      ),
    [assignments, selectedSubjectId],
  );
  const assignedEvaluatorIds = useMemo(
    () =>
      new Set(
        selectedSubjectAssignments.map(
          (assignment) => assignment.evaluator_member_id,
        ),
      ),
    [selectedSubjectAssignments],
  );
  const evaluatorCandidates = useMemo(() => {
    const keyword = evaluatorSearch.trim().toLowerCase();

    return members
      .filter((member) => {
        if (member.member_id === selectedSubjectId) return false;
        if (!keyword) return true;

        const fields = [
          member.full_name,
          member.team_name,
          member.position_name,
          member.title_name,
        ];
        return fields.some((field) => field?.toLowerCase().includes(keyword));
      })
      .sort((a, b) => {
        const checkedDiff =
          Number(assignedEvaluatorIds.has(b.member_id)) -
          Number(assignedEvaluatorIds.has(a.member_id));
        if (checkedDiff !== 0) return checkedDiff;

        const teamDiff = (a.team_name || "").localeCompare(
          b.team_name || "",
          "ko",
        );
        if (teamDiff !== 0) return teamDiff;

        const titleDiff =
          titleSortRank(a.title_name) - titleSortRank(b.title_name);
        if (titleDiff !== 0) return titleDiff;
        return a.full_name.localeCompare(b.full_name, "ko");
      });
  }, [assignedEvaluatorIds, evaluatorSearch, members, selectedSubjectId]);

  function invalidateRound() {
    queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.rounds });
    if (roundId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations.round(roundId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations.validation(roundId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations.auditLogs(roundId),
      });
    }
  }

  const updateRoundMutation = useMutation({
    mutationFn: async () =>
      requestJson<EvaluationRound>(`/api/evaluations/rounds/${roundId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roundForm),
      }),
    onSuccess: () => {
      toast.success("회차 정보가 저장되었습니다.");
      setEditDialogOpen(false);
      invalidateRound();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveSubjectsMutation = useMutation({
    mutationFn: async () =>
      requestJson<EvaluationSubject[]>(
        `/api/evaluations/rounds/${roundId}/subjects`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectIds, excludedIds: [] }),
        },
      ),
    onSuccess: () => {
      toast.success("대상자가 저장되었습니다.");
      invalidateRound();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const generateAssignmentsMutation = useMutation({
    mutationFn: async () => {
      await requestJson<EvaluationSubject[]>(
        `/api/evaluations/rounds/${roundId}/subjects`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectIds, excludedIds: [] }),
        },
      );

      return requestJson<EvaluationAssignment[]>(
        `/api/evaluations/rounds/${roundId}/assignments/generate`,
        { method: "POST" },
      );
    },
    onSuccess: (data) => {
      toast.success("평가자 배정 초안이 생성되었습니다.");
      setAssignments(data);
      invalidateRound();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveAssignmentsMutation = useMutation({
    mutationFn: async () =>
      requestJson<EvaluationAssignment[]>(
        `/api/evaluations/rounds/${roundId}/assignments`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignments: assignments.map((assignment) => ({
              subjectMemberId: assignment.subject_member_id,
              evaluatorMemberId: assignment.evaluator_member_id,
              source: assignment.source,
              isExcluded: assignment.is_excluded,
              excludedReason: assignment.excluded_reason || null,
            })),
          }),
        },
      ),
    onSuccess: () => {
      toast.success("평가자 배정이 저장되었습니다.");
      invalidateRound();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async () =>
      requestJson<EvaluationRound>(
        `/api/evaluations/rounds/${roundId}/confirm`,
        { method: "POST" },
      ),
    onSuccess: () => {
      toast.success("회차가 확정되었습니다.");
      invalidateRound();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deployMutation = useMutation({
    mutationFn: async (isDeployed: boolean) =>
      requestJson<EvaluationRound>(
        `/api/evaluations/rounds/${roundId}/deploy`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDeployed }),
        },
      ),
    onSuccess: (_, isDeployed) => {
      toast.success(isDeployed ? "배포되었습니다." : "배포가 해제되었습니다.");
      invalidateRound();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      await requestJson<EvaluationSubject[]>(
        `/api/evaluations/rounds/${roundId}/subjects`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectIds, excludedIds: [] }),
        },
      );

      await requestJson<EvaluationQuestion[]>(
        `/api/evaluations/rounds/${roundId}/questions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: questions.map((question, index) => ({
              positionId: question.position_id,
              questionType: question.question_type,
              prompt: question.prompt,
              weight: question.question_type === "score" ? question.weight : null,
              sortOrder: index + 1,
              isRequired: question.is_required,
            })),
          }),
        },
      );

      return requestJson<EvaluationAssignment[]>(
        `/api/evaluations/rounds/${roundId}/assignments`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignments: assignments.map((assignment) => ({
              subjectMemberId: assignment.subject_member_id,
              evaluatorMemberId: assignment.evaluator_member_id,
              source: assignment.source,
              isExcluded: assignment.is_excluded,
              excludedReason: assignment.excluded_reason || null,
            })),
          }),
        },
      );
    },
    onSuccess: (data) => {
      toast.success("모든 단계가 저장되었습니다.");
      setAssignments(data);
      invalidateRound();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function toggleAssignment(subjectId: string, evaluatorId: string) {
    if (subjectId === evaluatorId) return;

    setAssignments((prev) => {
      const exists = prev.some(
        (assignment) =>
          assignment.subject_member_id === subjectId &&
          assignment.evaluator_member_id === evaluatorId,
      );

      if (exists) {
        return prev.filter(
          (assignment) =>
            !(
              assignment.subject_member_id === subjectId &&
              assignment.evaluator_member_id === evaluatorId
            ),
        );
      }

      return [
        ...prev,
        {
          subject_member_id: subjectId,
          evaluator_member_id: evaluatorId,
          source: "manual",
          is_excluded: false,
        },
      ];
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!roundDetail) {
    return (
      <div className="evaluations-page space-y-4 p-6">
        <Link href="/evaluations">
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            목록으로
          </Button>
        </Link>
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          회차를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="evaluations-page space-y-5 p-6">
      <div className="flex items-center gap-3">
        <Link href="/evaluations">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">
              {roundDetail.name}
            </h1>
            <Badge
              className={cn(
                "border-0",
                roundDetail.is_deployed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {roundDetail.is_deployed
                ? "배포 ON"
                : statusLabel(roundDetail.status)}
            </Badge>
            <Badge variant="outline">v{roundDetail.config_version}</Badge>
            {detailFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {roundDetail.start_date} ~ {roundDetail.end_date} · 배포 ON 상태에서는 설정을 수정할 수 없습니다.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(!validation?.valid && "cursor-help")}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (validation && !validation.valid) {
                        toast.error("확정/배포 전 확인 필요", {
                          description: (
                            <ul className="mt-1 list-inside list-disc space-y-0.5">
                              {validation.errors.map((error) => (
                                <li key={error}>{error}</li>
                              ))}
                            </ul>
                          ),
                        });
                        return;
                      }
                      confirmMutation.mutate();
                    }}
                    disabled={isLocked || confirmMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    확정
                  </Button>
                </span>
              </TooltipTrigger>
              {validation && !validation.valid && (
                <TooltipContent side="bottom" align="end" className="max-w-xs">
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    확정/배포 전 확인 필요
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                    {validation.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button
            variant={roundDetail.is_deployed ? "outline" : "default"}
            onClick={() => deployMutation.mutate(!roundDetail.is_deployed)}
            disabled={deployMutation.isPending}
          >
            {roundDetail.is_deployed ? "배포 OFF" : "배포 ON"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
            disabled={isLocked}
          >
            <Pencil className="mr-1 h-4 w-4" />
            수정
          </Button>
          <Button
            variant="outline"
            onClick={() => setHistoryDialogOpen(true)}
          >
            <History className="mr-1 h-4 w-4" />
            변경 이력
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="px-0">
          <dl className="flex flex-wrap items-stretch">
            <div className="min-w-0 flex-1 pr-12">
              <dt className="text-sm font-medium text-slate-500">설명</dt>
              <dd className="mt-3 whitespace-pre-wrap text-base text-slate-700">
                {roundDetail.description || "-"}
              </dd>
            </div>
            <div className="px-12">
              <dt className="text-sm font-medium text-slate-500">시작일</dt>
              <dd className="mt-3 text-base font-medium text-slate-900">
                {roundDetail.start_date}
              </dd>
            </div>
            <div className="border-l border-slate-200 pl-12 pr-0">
              <dt className="text-sm font-medium text-slate-500">종료일</dt>
              <dd className="mt-3 text-base font-medium text-slate-900">
                {roundDetail.end_date}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveAllMutation.mutate()}
          disabled={isLocked || saveAllMutation.isPending}
        >
          {saveAllMutation.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          전체 저장
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-5 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                대상자 / 평가자 배정
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                팀을 선택하고 대상자 멤버별 평가자를 체크합니다.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={
                isLocked ||
                subjectIds.length === 0 ||
                generateAssignmentsMutation.isPending
              }
              onClick={() => generateAssignmentsMutation.mutate()}
            >
              {generateAssignmentsMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              자동 배정
            </Button>
          </div>

          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="표시할 구성원이 없습니다"
              description="구성원 정보를 불러오면 배정 화면이 표시됩니다."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[240px_320px_1fr]">
              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-medium text-slate-900">
                    1. 팀 선택
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    대상자 후보를 팀 단위로 좁힙니다.
                  </p>
                </div>
                <div className="max-h-[560px] space-y-1 overflow-auto p-2">
                  {teamOptions.map((team) => {
                    const isSelected = selectedTeamKey === team.key;

                    return (
                      <button
                        key={team.key}
                        type="button"
                        onClick={() => setSelectedTeamKey(team.key)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "border-slate-900 bg-white text-slate-900"
                            : "border-transparent text-slate-600 hover:border-slate-200",
                        )}
                      >
                        <span className="truncate text-sm font-medium">
                          {team.label}
                        </span>
                        <Badge variant="outline" className="shrink-0">
                          {team.count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-medium text-slate-900">
                    2. 멤버 선택
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    현재 표시된 모든 멤버는 평가 대상자입니다.
                  </p>
                </div>
                <div className="border-b border-slate-100 p-3">
                  <Input
                    value={subjectSearch}
                    placeholder="이름, 직급, 직책 검색"
                    onChange={(event) => setSubjectSearch(event.target.value)}
                  />
                </div>
                <div className="max-h-[500px] space-y-1 overflow-auto p-2">
                  {selectedTeamMembers.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      선택한 조건에 맞는 멤버가 없습니다.
                    </div>
                  ) : (
                    selectedTeamMembers.map((member) => {
                      const isSelected = selectedSubjectId === member.member_id;
                      const evaluatorCount = assignments.filter(
                        (assignment) =>
                          assignment.subject_member_id === member.member_id &&
                          !assignment.is_excluded,
                      ).length;

                      return (
                        <button
                          key={member.member_id}
                          type="button"
                          onClick={() => setSelectedSubjectId(member.member_id)}
                          className={cn(
                            "w-full rounded-md border px-3 py-2 text-left transition-colors",
                            isSelected
                              ? "border-slate-900 bg-white"
                              : "border-transparent hover:border-slate-200",
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-slate-900">
                              {member.full_name}
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">
                              {evaluatorCount}명
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-400">
                            {member.team_name || "-"} ·{" "}
                            {member.position_name || "-"} ·{" "}
                            {member.title_name || "-"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">
                      3. 평가자 선택
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedSubject
                        ? `${selectedSubject.full_name} 대상 평가자`
                        : "대상자를 먼저 선택하세요."}
                    </p>
                  </div>
                  <Badge className="border-0 bg-slate-100 text-slate-600">
                    {selectedSubjectAssignments.length}명 선택
                  </Badge>
                </div>
                <div className="border-b border-slate-100 p-3">
                  <Input
                    value={evaluatorSearch}
                    placeholder="평가자 이름, 팀, 직급, 직책 검색"
                    onChange={(event) => setEvaluatorSearch(event.target.value)}
                    disabled={!selectedSubject}
                  />
                </div>
                <div className="max-h-[500px] space-y-1 overflow-auto p-2">
                  {!selectedSubject ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      대상자 멤버를 선택하면 평가자 목록이 표시됩니다.
                    </div>
                  ) : evaluatorCandidates.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      선택 가능한 평가자가 없습니다.
                    </div>
                  ) : (
                    evaluatorCandidates.map((member) => {
                      const assignment = selectedSubjectAssignments.find(
                        (item) => item.evaluator_member_id === member.member_id,
                      );
                      const checked = Boolean(assignment);

                      return (
                        <label
                          key={member.member_id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors",
                            checked
                              ? "border-slate-900 bg-white"
                              : "border-transparent hover:border-slate-200",
                            isLocked && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isLocked}
                            onCheckedChange={() =>
                              toggleAssignment(
                                selectedSubjectId,
                                member.member_id,
                              )
                            }
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-slate-900">
                                {member.full_name}
                              </span>
                              {assignment && assignment.source !== "manual" && (
                                <Badge variant="outline" className="shrink-0">
                                  {sourceLabel(assignment.source)}
                                </Badge>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-400">
                              {member.team_name || "-"} ·{" "}
                              {member.position_name || "-"} ·{" "}
                              {member.title_name || "-"}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>회차 정보 수정</DialogTitle>
            <DialogDescription>
              회차명, 기간, 설명을 수정합니다. 배포 ON 상태에서는 수정할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">회차명</Label>
              <Input
                id="edit-name"
                value={roundForm.name}
                disabled={isLocked}
                placeholder="2026 상반기 다면평가"
                onChange={(event) =>
                  setRoundForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-start">시작일</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={roundForm.startDate}
                  disabled={isLocked}
                  onChange={(event) =>
                    setRoundForm((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">종료일</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={roundForm.endDate}
                  disabled={isLocked}
                  onChange={(event) =>
                    setRoundForm((prev) => ({
                      ...prev,
                      endDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">설명</Label>
              <Textarea
                id="edit-desc"
                rows={3}
                value={roundForm.description}
                disabled={isLocked}
                onChange={(event) =>
                  setRoundForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateRoundMutation.isPending}
            >
              취소
            </Button>
            <Button
              onClick={() => updateRoundMutation.mutate()}
              disabled={isLocked || updateRoundMutation.isPending}
            >
              {updateRoundMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>변경 이력</DialogTitle>
            <DialogDescription>
              이 회차의 설정 변경 감사 로그입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {auditLogs.length === 0 ? (
              <EmptyState
                icon={History}
                title="변경 이력이 없습니다"
                description="회차 설정을 저장하면 감사 로그가 기록됩니다."
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">일시</th>
                      <th className="px-4 py-3">작업</th>
                      <th className="px-4 py-3">대상</th>
                      <th className="px-4 py-3">작업자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-t">
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(log.created_at).toLocaleString("ko-KR")}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {actionLabel(log.action)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {targetLabel(log.target_table)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {log.actor?.full_name || log.actor_name || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
      <Icon className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}
