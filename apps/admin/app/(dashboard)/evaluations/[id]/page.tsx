"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Textarea } from "@repo/ui/src/textarea";
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
  evaluator_types?: string[] | null;
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

type EvaluationQuestionSet = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  items: unknown[];
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
const NO_POSITION_KEY = "__none__";
const POSITION_SORT_ORDER = ["인턴", "사원", "선임", "책임", "수석", "대표"];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "요청 처리에 실패했습니다.");
  }

  return payload as T;
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

function positionKey(positionName?: string | null) {
  return positionName?.trim() || NO_POSITION_KEY;
}

function positionLabel(key: string) {
  if (key === NO_POSITION_KEY) return "직급 미지정";
  return key;
}

function positionSortRank(positionName?: string | null) {
  const position = positionName || "";
  const index = POSITION_SORT_ORDER.findIndex((keyword) =>
    position.includes(keyword),
  );
  return index === -1 ? POSITION_SORT_ORDER.length : index;
}

function sortMembersByPosition(a: MemberRow, b: MemberRow) {
  const positionDiff =
    positionSortRank(a.position_name) - positionSortRank(b.position_name);
  if (positionDiff !== 0) return positionDiff;

  const titleDiff = titleSortRank(a.title_name) - titleSortRank(b.title_name);
  if (titleDiff !== 0) return titleDiff;

  return a.full_name.localeCompare(b.full_name, "ko");
}

function groupMembersByPosition(members: MemberRow[]) {
  const groups = new Map<string, MemberRow[]>();

  members.forEach((member) => {
    const key = positionKey(member.position_name);
    const group = groups.get(key) || [];
    group.push(member);
    groups.set(key, group);
  });

  return Array.from(groups.entries())
    .map(([key, items]) => ({
      key,
      label: positionLabel(key),
      items,
    }))
    .sort((a, b) => {
      const positionDiff =
        positionSortRank(a.items[0]?.position_name) -
        positionSortRank(b.items[0]?.position_name);
      if (positionDiff !== 0) return positionDiff;
      return a.label.localeCompare(b.label, "ko");
    });
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
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState("");
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([]);
  const [assignmentSourceMemory, setAssignmentSourceMemory] = useState<
    Record<string, AssignmentSource>
  >({});
  const [selectedTeamKey, setSelectedTeamKey] = useState(ALL_TEAMS_KEY);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState("");
  const [evaluatorSearch, setEvaluatorSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");

  const { data: members = EMPTY_MEMBERS } = useQuery<MemberRow[]>({
    queryKey: queryKeys.memberStatuses.list({}),
    queryFn: async () => requestJson<MemberRow[]>("/api/member-statuses"),
    staleTime: 60 * 1000,
  });

  const {
    data: roundDetail,
    isFetching: detailFetching,
    isLoading,
  } = useQuery<EvaluationRoundDetail>({
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

  const { data: questionSets = [] } = useQuery<EvaluationQuestionSet[]>({
    queryKey: queryKeys.evaluations.questionSets,
    queryFn: async () =>
      requestJson<EvaluationQuestionSet[]>("/api/evaluations/question-sets"),
  });

  const { data: auditLogs = EMPTY_AUDIT_LOGS } = useQuery<EvaluationAuditLog[]>(
    {
      queryKey: queryKeys.evaluations.auditLogs(roundId || undefined),
      queryFn: async () =>
        requestJson<EvaluationAuditLog[]>(
          `/api/evaluations/audit-logs?roundId=${roundId}`,
        ),
      enabled: !!roundId,
    },
  );

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
    setAssignmentSourceMemory({});
    setSelectedQuestionSetId(roundDetail.question_set_id || "");
  }, [roundDetail]);

  useEffect(() => {
    if (selectedQuestionSetId || questionSets.length === 0) return;
    const defaultSet = questionSets.find(
      (questionSet) => questionSet.is_active && questionSet.is_default,
    );
    setSelectedQuestionSetId(defaultSet?.id || "");
  }, [questionSets, selectedQuestionSetId]);

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
    const keyword = evaluatorSearch.trim().toLowerCase();
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

    return [...source].sort(sortMembersByPosition);
  }, [members, selectedTeamKey, evaluatorSearch]);

  const selectedTeamMemberGroups = useMemo(
    () => groupMembersByPosition(selectedTeamMembers),
    [selectedTeamMembers],
  );

  useEffect(() => {
    if (
      selectedEvaluatorId &&
      selectedTeamMembers.some(
        (member) => member.member_id === selectedEvaluatorId,
      )
    ) {
      return;
    }

    setSelectedEvaluatorId(selectedTeamMembers[0]?.member_id || "");
  }, [selectedEvaluatorId, selectedTeamMembers]);

  const selectedEvaluator = selectedEvaluatorId
    ? membersById.get(selectedEvaluatorId)
    : undefined;
  const selectedEvaluatorAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignment.evaluator_member_id === selectedEvaluatorId &&
          !assignment.is_excluded,
      ),
    [assignments, selectedEvaluatorId],
  );
  const assignedSubjectIds = useMemo(
    () =>
      new Set(
        selectedEvaluatorAssignments.map(
          (assignment) => assignment.subject_member_id,
        ),
      ),
    [selectedEvaluatorAssignments],
  );
  const assignedSubjectIdsForSave = useMemo(
    () =>
      Array.from(
        new Set(
          assignments
            .filter((assignment) => !assignment.is_excluded)
            .map((assignment) => assignment.subject_member_id),
        ),
      ),
    [assignments],
  );
  const activeQuestionSets = useMemo(
    () => questionSets.filter((questionSet) => questionSet.is_active),
    [questionSets],
  );
  const selectedQuestionSet = useMemo(
    () =>
      questionSets.find((questionSet) => questionSet.id === selectedQuestionSetId) ||
      null,
    [questionSets, selectedQuestionSetId],
  );
  const appliedQuestionSet = useMemo(
    () =>
      questionSets.find(
        (questionSet) => questionSet.id === roundDetail?.question_set_id,
      ) || null,
    [questionSets, roundDetail?.question_set_id],
  );
  const targetCandidates = useMemo(() => {
    const keyword = targetSearch.trim().toLowerCase();

    return members
      .filter((member) => {
        if (member.member_id === selectedEvaluatorId) return false;
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
        const positionDiff =
          positionSortRank(a.position_name) - positionSortRank(b.position_name);
        if (positionDiff !== 0) return positionDiff;

        const checkedDiff =
          Number(assignedSubjectIds.has(b.member_id)) -
          Number(assignedSubjectIds.has(a.member_id));
        if (checkedDiff !== 0) return checkedDiff;

        const titleDiff =
          titleSortRank(a.title_name) - titleSortRank(b.title_name);
        if (titleDiff !== 0) return titleDiff;

        const teamDiff = (a.team_name || "").localeCompare(
          b.team_name || "",
          "ko",
        );
        if (teamDiff !== 0) return teamDiff;

        return a.full_name.localeCompare(b.full_name, "ko");
      });
  }, [assignedSubjectIds, members, selectedEvaluatorId, targetSearch]);

  const targetCandidateGroups = useMemo(
    () => groupMembersByPosition(targetCandidates),
    [targetCandidates],
  );

  function normalizeAssignmentSource(
    assignment: Pick<
      EvaluationAssignment,
      "subject_member_id" | "evaluator_member_id" | "source"
    >,
  ): AssignmentSource {
    if (assignment.source !== "auto_same_team") {
      return assignment.source;
    }

    const subject = membersById.get(assignment.subject_member_id);
    const evaluator = membersById.get(assignment.evaluator_member_id);
    if (!subject || !evaluator) {
      return assignment.source;
    }

    return subject.team_id && subject.team_id === evaluator.team_id
      ? assignment.source
      : "manual";
  }

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
          body: JSON.stringify({
            subjectIds: assignedSubjectIdsForSave,
            excludedIds: [],
          }),
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

  const applyQuestionSetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuestionSetId) {
        throw new Error("적용할 문항 SET을 선택해주세요.");
      }

      return requestJson<EvaluationQuestion[]>(
        `/api/evaluations/rounds/${roundId}/questions/apply-set`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionSetId: selectedQuestionSetId }),
        },
      );
    },
    onSuccess: (data) => {
      toast.success("문항 SET이 적용되었습니다.");
      setQuestions([...data].sort((a, b) => a.sort_order - b.sort_order));
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
              source: normalizeAssignmentSource(assignment),
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
          body: JSON.stringify({
            subjectIds: assignedSubjectIdsForSave,
            excludedIds: [],
          }),
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
              evaluatorTypes: question.evaluator_types || ["상사", "동료"],
              weight:
                question.question_type === "score" ? question.weight : null,
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
              source: normalizeAssignmentSource(assignment),
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

    const sourceKey = `${subjectId}:${evaluatorId}`;
    const currentAssignment = assignments.find(
      (assignment) =>
        assignment.subject_member_id === subjectId &&
        assignment.evaluator_member_id === evaluatorId,
    );

    if (currentAssignment) {
      const currentSource = normalizeAssignmentSource(currentAssignment);
      if (currentSource !== "manual") {
        setAssignmentSourceMemory((prev) => ({
          ...prev,
          [sourceKey]: currentSource,
        }));
      }
    }

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

      const rememberedSource = assignmentSourceMemory[sourceKey];
      const originalAssignment = roundDetail?.assignments.find(
        (assignment) =>
          assignment.subject_member_id === subjectId &&
          assignment.evaluator_member_id === evaluatorId,
      );
      const restoredSource = rememberedSource
        ? normalizeAssignmentSource({
            subject_member_id: subjectId,
            evaluator_member_id: evaluatorId,
            source: rememberedSource,
          })
        : originalAssignment
          ? normalizeAssignmentSource(originalAssignment)
          : "manual";

      return [
        ...prev,
        {
          subject_member_id: subjectId,
          evaluator_member_id: evaluatorId,
          source: restoredSource,
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
              {roundDetail.is_deployed ? "배포 ON" : "배포 OFF"}
            </Badge>
            <Badge variant="outline">v{roundDetail.config_version}</Badge>
            {detailFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {roundDetail.start_date} ~ {roundDetail.end_date} · 배포 ON
            상태에서는 설정을 수정할 수 없습니다.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant={roundDetail.is_deployed ? "outline" : "default"}
            onClick={() => {
              if (!roundDetail.is_deployed && validation && !validation.valid) {
                toast.error("배포 전 확인 필요", {
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
              deployMutation.mutate(!roundDetail.is_deployed);
            }}
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
          <Button variant="outline" onClick={() => setHistoryDialogOpen(true)}>
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

      <Card className="border-0 shadow-none">
        <CardContent className="space-y-5 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                적용 SET / 평가자 / 대상자 배정
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                문항 SET을 먼저 적용한 뒤 팀, 평가자, 대상자를 순서대로 배정합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <Button
                onClick={() => saveAllMutation.mutate()}
                disabled={
                  isLocked ||
                  assignedSubjectIdsForSave.length === 0 ||
                  saveAllMutation.isPending
                }
              >
                {saveAllMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                전체 저장
              </Button>
            </div>
          </div>

          <div className="grid overflow-hidden rounded-lg bg-white lg:grid-cols-[280px_220px_300px_1fr]">
            <section>
              <div className="relative flex min-h-[82px] items-center bg-slate-50/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    1
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-slate-900">
                      적용 SET 설정
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      회차 문항을 SET 기준으로 구성합니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-3">
                <Select
                  value={selectedQuestionSetId}
                  onValueChange={setSelectedQuestionSetId}
                  disabled={isLocked || activeQuestionSets.length === 0}
                >
                  <SelectTrigger className="h-10 w-full bg-white">
                    <SelectValue placeholder="문항 SET 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeQuestionSets.map((questionSet) => (
                      <SelectItem key={questionSet.id} value={questionSet.id}>
                        {questionSet.name}
                        {questionSet.is_default ? " · 기본" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => applyQuestionSetMutation.mutate()}
                  disabled={
                    isLocked ||
                    !selectedQuestionSetId ||
                    applyQuestionSetMutation.isPending
                  }
                >
                  {applyQuestionSetMutation.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" />
                  )}
                  SET 적용
                </Button>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                  <p>
                    현재 적용 SET:{" "}
                    <span className="font-medium text-slate-700">
                      {appliedQuestionSet?.name || "없음"}
                    </span>
                  </p>
                  {roundDetail.question_set_applied_at && (
                    <p className="text-slate-400">
                      {new Date(
                        roundDetail.question_set_applied_at,
                      ).toLocaleString("ko-KR")}
                    </p>
                  )}
                  {selectedQuestionSet &&
                    selectedQuestionSet.id !== roundDetail.question_set_id && (
                      <p className="text-blue-600">
                        선택됨: {selectedQuestionSet.name}
                      </p>
                    )}
                </div>
              </div>
            </section>

            {members.length === 0 ? (
              <div className="p-4 lg:col-span-3">
                <EmptyState
                  icon={Users}
                  title="표시할 구성원이 없습니다"
                  description="구성원 정보를 불러오면 배정 화면이 표시됩니다."
                />
              </div>
            ) : (
              <>
              <section>
                <div className="relative flex min-h-[82px] items-center bg-slate-50/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      2
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-slate-900">
                        팀 선택
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        멤버 후보를 팀 단위로 좁힙니다.
                      </p>
                    </div>
                  </div>
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
                          "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-slate-100 text-slate-900"
                            : "bg-slate-50/60 text-slate-600 hover:bg-slate-100/80",
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

              <section>
                <div className="relative flex min-h-[82px] items-center bg-slate-50/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      3
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-slate-900">
                        평가자 선택
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        평가 주체(평가하는 사람)를 선택합니다.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <Input
                    value={evaluatorSearch}
                    placeholder="이름, 직급, 직책 검색"
                    onChange={(event) => setEvaluatorSearch(event.target.value)}
                  />
                </div>
                <div className="max-h-[500px] space-y-3 overflow-auto p-2">
                  {selectedTeamMembers.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      선택한 조건에 맞는 멤버가 없습니다.
                    </div>
                  ) : (
                    selectedTeamMemberGroups.map((group) => (
                      <div key={group.key} className="space-y-1">
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="text-xs font-semibold text-slate-500">
                            {group.label}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {group.items.length}명
                          </span>
                        </div>
                        {group.items.map((member) => {
                          const isSelected =
                            selectedEvaluatorId === member.member_id;
                          const targetCount = assignments.filter(
                            (assignment) =>
                              assignment.evaluator_member_id ===
                                member.member_id && !assignment.is_excluded,
                          ).length;

                          return (
                            <button
                              key={member.member_id}
                              type="button"
                              onClick={() =>
                                setSelectedEvaluatorId(member.member_id)
                              }
                              className={cn(
                                "w-full rounded-md px-3 py-2 text-left transition-colors",
                                isSelected
                                  ? "bg-slate-100"
                                  : "bg-slate-50/60 hover:bg-slate-100/80",
                              )}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-medium text-slate-900">
                                  {member.full_name}
                                </span>
                                <span className="shrink-0 text-xs text-slate-400">
                                  {targetCount}명
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-400">
                                {member.team_name || "-"} ·{" "}
                                {member.position_name || "-"} ·{" "}
                                {member.title_name || "-"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <div className="flex min-h-[82px] flex-wrap items-center justify-between gap-2 bg-slate-50/70 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      4
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-slate-900">
                        대상자 선택
                      </h3>
                      <p className="mt-1 truncate text-xs leading-5 text-slate-500">
                        {selectedEvaluator
                          ? `${selectedEvaluator.full_name}님이 평가할 대상자`
                          : "평가 주체를 먼저 선택하세요."}
                      </p>
                    </div>
                  </div>
                  <Badge className="border-0 bg-slate-100 text-slate-600">
                    {selectedEvaluatorAssignments.length}명 선택
                  </Badge>
                </div>
                <div className="p-3">
                  <Input
                    value={targetSearch}
                    placeholder="대상자 이름, 팀, 직급, 직책 검색"
                    onChange={(event) => setTargetSearch(event.target.value)}
                    disabled={!selectedEvaluator}
                  />
                </div>
                <div className="max-h-[500px] space-y-3 overflow-auto p-2">
                  {!selectedEvaluator ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      평가 주체를 선택하면 대상자 목록이 표시됩니다.
                    </div>
                  ) : targetCandidates.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      선택 가능한 대상자가 없습니다.
                    </div>
                  ) : (
                    targetCandidateGroups.map((group) => (
                      <div key={group.key} className="space-y-1">
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="text-xs font-semibold text-slate-500">
                            {group.label}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {group.items.length}명
                          </span>
                        </div>
                        {group.items.map((member) => {
                          const assignment = selectedEvaluatorAssignments.find(
                            (item) =>
                              item.subject_member_id === member.member_id,
                          );
                          const checked = Boolean(assignment);
                          const displaySource = assignment
                            ? normalizeAssignmentSource(assignment)
                            : null;

                          return (
                            <label
                              key={member.member_id}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 transition-colors",
                                checked
                                  ? "bg-slate-100"
                                  : "bg-slate-50/60 hover:bg-slate-100/80",
                                isLocked && "cursor-not-allowed opacity-60",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={isLocked}
                                onCheckedChange={() =>
                                  toggleAssignment(
                                    member.member_id,
                                    selectedEvaluatorId,
                                  )
                                }
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium text-slate-900">
                                    {member.full_name}
                                  </span>
                                  {displaySource &&
                                    displaySource !== "manual" && (
                                      <Badge
                                        variant="outline"
                                        className="shrink-0"
                                      >
                                        {sourceLabel(displaySource)}
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
                        })}
                      </div>
                    ))
                  )}
                </div>
              </section>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>회차 정보 수정</DialogTitle>
            <DialogDescription>
              회차명, 기간, 설명을 수정합니다. 배포 ON 상태에서는 수정할 수
              없습니다.
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
                  setRoundForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
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
