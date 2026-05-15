"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, Send } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";

type ScaleOption = {
  value: number;
  label: string;
  weight: number;
};

type Question = {
  id: string;
  questionType: "score" | "subjective";
  prompt: string;
  evaluatorTypes: string[];
  isRequired: boolean;
  sortOrder: number;
  scale: ScaleOption[];
};

type EvaluationSubject = {
  assignmentId: string;
  subjectMemberId: string;
  subjectName: string;
  positionName: string | null;
  teamName: string | null;
  submittedAt: string | null;
  responseId: string | null;
  answers: AnswerState;
  questions: Question[];
};

type EvaluationDetail = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  evaluatorType: string;
  subjects: EvaluationSubject[];
};

type AnswerState = Record<string, { scoreValue?: number; textAnswer?: string }>;
type QuestionSectionKey = "common" | "manager" | "peer";

const QUESTION_SECTIONS: Array<{
  key: QuestionSectionKey;
  label: string;
  evaluatorTypes: string[];
}> = [
  { key: "common", label: "공통", evaluatorTypes: ["상사", "동료"] },
  { key: "manager", label: "상사", evaluatorTypes: ["상사"] },
  { key: "peer", label: "동료평가", evaluatorTypes: ["동료"] },
];

export function EvaluationDetailClient({ roundId }: { roundId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<EvaluationDetail | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSectionKey, setSelectedSectionKey] = useState<QuestionSectionKey>("common");
  const [answersBySubject, setAnswersBySubject] = useState<Record<string, AnswerState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDetail = useCallback(async (nextSelectedSubjectId?: string | null) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/evaluations/rounds/${roundId}`);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(body?.error || "평가자로 배정된 회차만 작성할 수 있습니다.");
          router.replace("/evaluations");
          return;
        }
        throw new Error(body?.error || "다면평가 상세를 불러오지 못했습니다.");
      }

      const nextDetail = body as EvaluationDetail;
      setDetail(nextDetail);
      setAnswersBySubject((prev) => ({
        ...prev,
        ...Object.fromEntries(
          nextDetail.subjects.map((subject) => [
            subject.subjectMemberId,
            {
              ...prev[subject.subjectMemberId],
              ...subject.answers,
            },
          ]),
        ),
      }));
      setSelectedSubjectId(
        nextSelectedSubjectId ??
          nextDetail.subjects.find((subject) => !subject.submittedAt)?.subjectMemberId ??
          nextDetail.subjects[0]?.subjectMemberId ??
          null,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "다면평가 상세를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [roundId, router]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const selectedSubject = useMemo(
    () =>
      detail?.subjects.find(
        (subject) => subject.subjectMemberId === selectedSubjectId,
      ) || null,
    [detail?.subjects, selectedSubjectId],
  );

  const selectedAnswers = useMemo(
    () =>
      selectedSubjectId && answersBySubject[selectedSubjectId]
        ? answersBySubject[selectedSubjectId]
        : {},
    [answersBySubject, selectedSubjectId],
  );

  const questionSections = useMemo(
    () =>
      QUESTION_SECTIONS.map((section) => {
        const questions =
          selectedSubject?.questions.filter((question) =>
            questionBelongsToSection(question, section.key),
          ) || [];
        const answeredCount = questions.filter((question) =>
          isQuestionAnswered(question, selectedAnswers[question.id]),
        ).length;

        return {
          ...section,
          questions,
          answeredCount,
        };
      }),
    [selectedAnswers, selectedSubject?.questions],
  );
  const visibleSections = questionSections.filter((section) => section.questions.length > 0);
  const selectedSection =
    visibleSections.find((section) => section.key === selectedSectionKey) ||
    visibleSections[0] ||
    null;

  useEffect(() => {
    if (
      selectedSectionKey &&
      visibleSections.some((section) => section.key === selectedSectionKey)
    ) {
      return;
    }
    setSelectedSectionKey(visibleSections[0]?.key || "common");
  }, [selectedSectionKey, visibleSections]);

  function updateAnswer(questionId: string, patch: { scoreValue?: number; textAnswer?: string }) {
    if (!selectedSubjectId) return;

    setAnswersBySubject((prev) => ({
      ...prev,
      [selectedSubjectId]: {
        ...(prev[selectedSubjectId] || {}),
        [questionId]: {
          ...(prev[selectedSubjectId]?.[questionId] || {}),
          ...patch,
        },
      },
    }));
  }

  async function handleSubmit() {
    if (!selectedSubject || selectedSubject.submittedAt) return;

    const missing = selectedSubject.questions.find((question) => {
      const answer = selectedAnswers[question.id];
      if (!question.isRequired) return false;
      return !isQuestionAnswered(question, answer);
    });

    if (missing) {
      setSelectedSectionKey(getQuestionSectionKey(missing));
      toast.error("필수 문항을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/evaluations/rounds/${roundId}/subjects/${selectedSubject.subjectMemberId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: selectedSubject.questions.map((question) => ({
              questionId: question.id,
              scoreValue: selectedAnswers[question.id]?.scoreValue,
              textAnswer: selectedAnswers[question.id]?.textAnswer,
            })),
          }),
        },
      );
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || "다면평가를 제출하지 못했습니다.");
      }

      toast.success("다면평가가 제출되었습니다.");
      await loadDetail(selectedSubject.subjectMemberId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "다면평가를 제출하지 못했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        다면평가 정보를 불러오지 못했습니다.
      </div>
    );
  }

  const submittedCount = detail.subjects.filter((subject) => subject.submittedAt).length;
  const otherSubjects = detail.subjects.filter(
    (subject) => subject.subjectMemberId !== selectedSubjectId,
  );

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => router.push("/evaluations")}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-[#111111]"
      >
        <ArrowLeft size={16} />
        목록으로
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">{detail.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatFullDate(detail.startDate)} - {formatFullDate(detail.endDate)}
          </p>
          {detail.description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {detail.description}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[#f3f3f3] bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400">제출 현황</p>
          <p className="mt-1 text-lg font-semibold text-[#111111]">
            {submittedCount}/{detail.subjects.length}명
          </p>
        </div>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="relative space-y-2 self-stretch">
          {selectedSubject && (
            <div
              className="z-10 bg-white pb-2"
              style={{ position: "sticky", top: 0 }}
            >
              <SubjectCard
                subject={selectedSubject}
                isActive
                onClick={() => setSelectedSubjectId(selectedSubject.subjectMemberId)}
              />
            </div>
          )}
          <div className="space-y-2">
            {otherSubjects.map((subject) => (
              <SubjectCard
                key={subject.assignmentId}
                subject={subject}
                isActive={false}
                onClick={() => setSelectedSubjectId(subject.subjectMemberId)}
              />
            ))}
          </div>
        </aside>

        <div className="min-w-0 rounded-xl border border-[#f3f3f3] bg-white">
          {selectedSubject ? (
            <div className="px-4 py-0 sm:px-5 sm:py-0">
              {selectedSubject.questions.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">
                    작성할 문항이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-4">
                  <QuestionProgress
                    sections={questionSections}
                    selectedKey={selectedSection?.key || "common"}
                    onSelect={setSelectedSectionKey}
                  />
                  {(selectedSection?.questions || []).map((question, index) => (
                    <QuestionField
                      key={question.id}
                      index={index}
                      question={question}
                      answer={selectedAnswers[question.id]}
                      disabled={Boolean(selectedSubject.submittedAt)}
                      onChange={(patch) => updateAnswer(question.id, patch)}
                    />
                  ))}

                  {!selectedSubject.submittedAt && (
                    <div className="flex justify-end border-t border-[#f3f3f3] pt-4">
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#111111] px-4 text-sm font-medium text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                        제출하기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              평가 대상을 선택해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  isActive,
  onClick,
}: {
  subject: EvaluationSubject;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
        isActive
          ? "border-[#f3f3f3] bg-white"
          : "border-[#f3f3f3] bg-white hover:border-[#f3f3f3]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111111]">
            {subject.subjectName}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {[subject.teamName, subject.positionName].filter(Boolean).join(" · ") ||
              "조직 정보 없음"}
          </p>
        </div>
        {subject.submittedAt ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : (
          <ClipboardCheck className="h-4 w-4 shrink-0 text-slate-300" />
        )}
      </div>
      <p className="mt-3 text-[11px] font-medium text-slate-400">
        {subject.submittedAt
          ? `${formatDateTime(subject.submittedAt)} 제출`
          : `${subject.questions.length}개 문항`}
      </p>
    </button>
  );
}

function QuestionField({
  index,
  question,
  answer,
  disabled,
  onChange,
}: {
  index: number;
  question: Question;
  answer?: { scoreValue?: number; textAnswer?: string };
  disabled: boolean;
  onChange: (patch: { scoreValue?: number; textAnswer?: string }) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="rounded-lg bg-[#fafafa] px-3 py-3"
    >
      <div className="flex gap-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-500">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-line text-[13px] font-medium leading-5 text-[#111111]">
            {question.prompt}
            {question.isRequired && <span className="text-rose-500"> *</span>}
          </p>

          {question.questionType === "score" ? (
            <div className="mt-3 grid gap-1.5 sm:grid-cols-5">
              {question.scale.map((option) => {
                const selected = answer?.scoreValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ scoreValue: option.value })}
                    className={`min-h-12 rounded-md border px-2 py-1.5 text-center transition-colors disabled:cursor-not-allowed ${
                      selected
                        ? "border-[#111111] bg-[#111111] text-white disabled:border-[#111111] disabled:bg-[#111111] disabled:text-white"
                        : "border-[#eeeeee] bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-[13px] font-semibold">
                      {option.value}점
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-3">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answer?.textAnswer || ""}
              disabled={disabled}
              onChange={(event) => onChange({ textAnswer: event.target.value })}
              placeholder="의견을 입력해주세요."
              className="mt-3 min-h-20 w-full resize-none rounded-md border border-[#eeeeee] bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-[#111111] disabled:bg-slate-50 disabled:text-slate-400"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function QuestionProgress({
  sections,
  selectedKey,
  onSelect,
}: {
  sections: Array<{
    key: QuestionSectionKey;
    label: string;
    questions: Question[];
    answeredCount: number;
  }>;
  selectedKey: QuestionSectionKey;
  onSelect: (key: QuestionSectionKey) => void;
}) {
  const totalCount = sections.reduce(
    (sum, section) => sum + section.questions.length,
    0,
  );
  const answeredCount = sections.reduce(
    (sum, section) => sum + section.answeredCount,
    0,
  );
  const totalPercent = totalCount
    ? Math.round((answeredCount / totalCount) * 100)
    : 0;

  return (
    <div className="border-b border-[#f3f3f3] bg-white pb-3">
      <div className="mb-2 flex items-center justify-between text-[11px] font-medium">
        <span className="text-slate-400">문항 진행</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">
            {totalPercent}%
          </span>
          <ProgressCircle percent={totalPercent} isSelected={false} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {sections.map((section) => {
          const isSelected = section.key === selectedKey;
          const isEmpty = section.questions.length === 0;

          return (
            <button
              key={section.key}
              type="button"
              disabled={isEmpty}
              onClick={() => onSelect(section.key)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isSelected
                  ? "border-slate-300 bg-slate-50 text-[#111111]"
                  : "border-[#f3f3f3] bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{section.label}</span>
                <span
                  className={`text-[11px] font-medium ${
                    isSelected ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {section.answeredCount}/{section.questions.length}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProgressCircle({
  percent,
  isSelected,
}: {
  percent: number;
  isSelected: boolean;
}) {
  const normalizedPercent = Math.max(0, Math.min(100, percent));
  const background = isSelected
    ? `conic-gradient(#ffffff ${normalizedPercent}%, rgba(255,255,255,0.22) 0)`
    : `conic-gradient(#111111 ${normalizedPercent}%, #f1f5f9 0)`;

  return (
    <span
      aria-hidden="true"
      className="relative h-5 w-5 shrink-0 rounded-full"
      style={{ background }}
    >
      <span
        className={`absolute inset-[4px] rounded-full ${
          isSelected ? "bg-[#111111]" : "bg-white"
        }`}
      />
    </span>
  );
}

function questionBelongsToSection(
  question: Question,
  sectionKey: QuestionSectionKey,
) {
  return getQuestionSectionKey(question) === sectionKey;
}

function getQuestionSectionKey(question: Question): QuestionSectionKey {
  const evaluatorTypes = normalizeEvaluatorTypes(question.evaluatorTypes);
  const hasManager = evaluatorTypes.includes("상사");
  const hasPeer = evaluatorTypes.includes("동료");

  if (hasManager && hasPeer) return "common";
  if (hasManager) return "manager";
  return "peer";
}

function normalizeEvaluatorTypes(evaluatorTypes: string[]) {
  return evaluatorTypes.length > 0 ? evaluatorTypes : ["상사", "동료"];
}

function isQuestionAnswered(
  question: Question,
  answer?: { scoreValue?: number; textAnswer?: string },
) {
  if (!answer) return false;
  if (question.questionType === "score") return answer.scoreValue !== undefined;
  return Boolean(answer.textAnswer?.trim());
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${date}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
