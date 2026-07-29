"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import { Textarea } from "@repo/ui/src/textarea";
import {
  careersApi,
  careersKeys,
  type CareerType,
  type CoverLetterQuestion,
  type EmploymentType,
  type JobPosting,
  useCareersMutation,
} from "@/hooks/useCareersApi";
import { reorder } from "@/components/postingProcess";
import { todayInSeoul } from "@/lib/careers/date";

const DEFAULT_QUESTIONS = [
  "지원 동기를 작성해주세요.",
  "흥미를 느낀 사업 분야와 그 이유를 작성해주세요.",
  "새로운 지식이나 기술을 배우기 위해 노력했던 경험을 작성해주세요.",
  "문제를 발견하고 개선했던 경험을 작성해주세요.",
];

function initialQuestions(posting?: JobPosting): CoverLetterQuestion[] {
  if (posting) return posting.coverLetterQuestions;
  return DEFAULT_QUESTIONS.map((question) => ({
    id: crypto.randomUUID(),
    question,
  }));
}

export function PostingForm({
  posting,
  fieldSuggestions = [],
  onCancel,
  onSaved,
  resetKey,
  layout = "stacked",
}: {
  posting?: JobPosting;
  fieldSuggestions?: string[];
  onCancel: () => void;
  onSaved: () => void;
  resetKey?: unknown;
  layout?: "stacked" | "split";
}) {
  const split = layout === "split";
  const [careerType, setCareerType] = useState<CareerType>(
    posting?.careerType || "신입",
  );
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    posting?.employmentType || "정규직",
  );
  const [startDate, setStartDate] = useState(
    posting?.startDate || todayInSeoul(),
  );
  const [endDate, setEndDate] = useState(posting?.endDate || "");
  const [isPublic, setIsPublic] = useState(posting?.isPublic ?? true);
  const [questions, setQuestions] = useState(() => initialQuestions(posting));
  const mutation = useCareersMutation(
    (body: Record<string, unknown>) =>
      posting
        ? careersApi.updatePosting(posting.id, body)
        : careersApi.createPosting(body),
    [careersKeys.all],
  );

  useEffect(() => {
    setCareerType(posting?.careerType || "신입");
    setEmploymentType(posting?.employmentType || "정규직");
    setStartDate(posting?.startDate || todayInSeoul());
    setEndDate(posting?.endDate || "");
    setIsPublic(posting?.isPublic ?? true);
    setQuestions(initialQuestions(posting));
  }, [posting, resetKey]);

  function patchQuestion(id: string, patch: Partial<CoverLetterQuestion>) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    const field = String(data.get("field") || "").trim();
    if (!title || !field || !startDate || !endDate) {
      toast.error(
        "공고 제목, 모집 분야, 게시 시작일과 종료일을 입력해 주세요.",
      );
      return;
    }
    if (endDate < startDate) {
      toast.error("게시 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    const body = {
      title,
      field,
      department: field,
      careerType,
      employmentType,
      startDate,
      endDate,
      publishedAt: new Date(`${startDate}T00:00:00`).toISOString(),
      closesAt: new Date(`${endDate}T23:59:59`).toISOString(),
      isPublic,
      description: String(data.get("description") || ""),
      content: String(data.get("content") || ""),
      coverLetterQuestions: questions
        .filter((question) => question.question.trim())
        .map((question) => ({
          ...question,
          question: question.question.trim(),
        })),
    };

    try {
      await mutation.mutateAsync(body);
      toast.success(posting ? "공고를 수정했습니다." : "공고를 등록했습니다.");
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      className={split ? "grid items-start gap-5 lg:grid-cols-2" : "space-y-5"}
    >
      <div
        className={`flex items-center justify-between gap-3 ${
          split ? "lg:col-span-2" : ""
        }`}
      >
        <Link
          href="/postings"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" aria-hidden />
          공고 목록
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>

      <section className={split ? "rounded-xl bg-[#fafafa] p-5" : ""}>
        {split && (
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">공고 정보</h2>
            <p className="mt-1 text-xs text-slate-500">
              공고 기본 정보와 게시 내용을 입력합니다.
            </p>
          </div>
        )}
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="posting-title">공고 제목 *</Label>
            <Input
              id="posting-title"
              name="title"
              defaultValue={posting?.title}
              placeholder="예: 2026 상반기 백엔드 개발자 채용"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="posting-field">모집 분야 *</Label>
            <Input
              id="posting-field"
              name="field"
              list="posting-field-suggestions"
              defaultValue={posting?.field || posting?.department}
              placeholder="예: 개발, UX 디자이너, 데이터 분석"
              required
            />
            <datalist id="posting-field-suggestions">
              {fieldSuggestions.map((field) => (
                <option key={field} value={field} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label>구분</Label>
            <Select
              value={careerType}
              onValueChange={(value) => setCareerType(value as CareerType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="신입">신입</SelectItem>
                <SelectItem value="경력">경력</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>고용 형태</Label>
            <Select
              value={employmentType}
              onValueChange={(value) =>
                setEmploymentType(value as EmploymentType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="정규직">정규직</SelectItem>
                <SelectItem value="계약직">계약직</SelectItem>
                <SelectItem value="인턴">인턴</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>게시 기간 *</Label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate, endDate }) => {
                setStartDate(startDate);
                setEndDate(endDate);
              }}
              modal
              ariaLabel="게시 기간"
              placeholder="게시 시작일과 종료일 선택"
            />
          </div>
          <label className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3 sm:col-span-2">
            <span>
              <span className="block text-sm font-medium">공개 여부</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                비공개 공고는 외부 지원자 페이지 구축 후 노출되지 않습니다.
              </span>
            </span>
            <Checkbox
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked === true)}
            />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="posting-description">공고 요약</Label>
            <Input
              id="posting-description"
              name="description"
              defaultValue={posting?.description}
              placeholder="목록에 노출할 한 줄 요약"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="posting-content">공고 본문</Label>
            <Textarea
              id="posting-content"
              name="content"
              rows={7}
              defaultValue={posting?.content}
              placeholder="공고 상세 내용을 입력하세요."
            />
          </div>
        </div>
      </section>

      <section
        className={
          split
            ? "space-y-3 rounded-xl bg-[#fafafa] p-5"
            : "space-y-3 border-t border-slate-100 pt-5"
        }
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">자기소개서 문항</h3>
            <p className="mt-1 text-xs text-slate-500">
              문항별 최대 글자 수를 비워두면 제한하지 않습니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setQuestions((current) => [
                ...current,
                { id: crypto.randomUUID(), question: "" },
              ])
            }
          >
            <Plus /> 문항 추가
          </Button>
        </div>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className={`flex items-start gap-2 rounded-lg p-3 ${
                split ? "bg-white" : "bg-slate-50"
              }`}
            >
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-[40px]"
                  aria-label="문항 위로 이동"
                  disabled={index === 0}
                  onClick={() =>
                    setQuestions((current) =>
                      reorder(current, index, index - 1),
                    )
                  }
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-[40px]"
                  aria-label="문항 아래로 이동"
                  disabled={index === questions.length - 1}
                  onClick={() =>
                    setQuestions((current) =>
                      reorder(current, index, index + 1),
                    )
                  }
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Textarea
                  value={question.question}
                  onChange={(event) =>
                    patchQuestion(question.id, {
                      question: event.target.value,
                    })
                  }
                  rows={2}
                  placeholder={`문항 ${index + 1} 내용을 입력하세요.`}
                />
                <div className="flex items-center justify-end gap-2">
                  <Label
                    className="shrink-0 text-xs text-slate-500"
                    htmlFor={`question-max-${question.id}`}
                  >
                    최대 글자 수
                  </Label>
                  <Input
                    id={`question-max-${question.id}`}
                    className="h-8 w-28"
                    type="number"
                    min={1}
                    value={question.maxLength ?? ""}
                    onChange={(event) =>
                      patchQuestion(question.id, {
                        maxLength: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="문항 삭제"
                onClick={() =>
                  setQuestions((current) =>
                    current.filter((item) => item.id !== question.id),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
