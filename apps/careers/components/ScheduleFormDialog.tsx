"use client";

import { useState } from "react";
import { Button } from "@repo/ui/src/button";
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
import { toast } from "@repo/ui/src/sonner";
import {
  careersApi,
  careersKeys,
  type ApplicationSummary,
  type ScheduleItem,
  type ScheduleStatus,
  useCareersMutation,
} from "@/hooks/useCareersApi";

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  applications,
  hasMoreApplications,
  isFetchingMoreApplications,
  fetchMoreApplicationsFailed,
  onFetchMoreApplications,
  schedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: ApplicationSummary[];
  hasMoreApplications: boolean;
  isFetchingMoreApplications: boolean;
  fetchMoreApplicationsFailed: boolean;
  onFetchMoreApplications: () => Promise<unknown>;
  schedule?: ScheduleItem;
}) {
  const [applicationId, setApplicationId] = useState(
    schedule?.applicationId || applications[0]?.id || "",
  );
  const [status, setStatus] = useState<ScheduleStatus>(
    schedule?.status || "scheduled",
  );
  const applicationOptions =
    schedule &&
    !applications.some(
      (application) => application.id === schedule.applicationId,
    )
      ? [
          {
            id: schedule.applicationId,
            applicantName: schedule.applicantName,
            postingTitle: schedule.postingTitle,
          },
          ...applications,
        ]
      : applications;
  const mutation = useCareersMutation(
    (body: Record<string, unknown>) =>
      schedule
        ? careersApi.updateSchedule(schedule.id, body)
        : careersApi.createSchedule(body),
    [careersKeys.schedules(), careersKeys.all],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const startsAt = String(data.get("startsAt") || "");
    const endsAt = String(data.get("endsAt") || "");
    const application = applications.find((item) => item.id === applicationId);
    if (!application && !schedule) {
      toast.error("일정을 등록할 지원자를 선택해 주세요.");
      return;
    }
    try {
      await mutation.mutateAsync({
        applicationId,
        postingId: application?.postingId || schedule?.postingId,
        stageId: application?.stageId ?? schedule?.stageId,
        title: data.get("title"),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        location: data.get("location") || null,
        note: data.get("note") || null,
        status,
      });
      toast.success(schedule ? "일정을 수정했습니다." : "일정을 등록했습니다.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule ? "일정 수정" : "일정 등록"}</DialogTitle>
          <DialogDescription>
            한 지원자에게 여러 일정을 등록할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>지원자</Label>
              <Select
                value={applicationId}
                onValueChange={setApplicationId}
                disabled={Boolean(schedule)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="지원자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {applicationOptions.map((application) => (
                    <SelectItem key={application.id} value={application.id}>
                      {application.applicantName} / {application.postingTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!schedule && hasMoreApplications && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={isFetchingMoreApplications}
                  onClick={() => void onFetchMoreApplications()}
                >
                  {isFetchingMoreApplications
                    ? "지원자 불러오는 중..."
                    : fetchMoreApplicationsFailed
                      ? "지원자 불러오기 실패 · 다시 시도"
                      : "지원자 더 보기"}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-title">일정명</Label>
              <Input
                id="schedule-title"
                name="title"
                defaultValue={schedule?.title}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schedule-start">시작</Label>
                <Input
                  id="schedule-start"
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={localDateTime(schedule?.startsAt)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-end">종료</Label>
                <Input
                  id="schedule-end"
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={localDateTime(schedule?.endsAt)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>상태</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ScheduleStatus)}
              >
                <SelectTrigger className="w-full" aria-label="일정 상태">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">예정</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-location">장소 / 접속 정보</Label>
              <Input
                id="schedule-location"
                name="location"
                defaultValue={schedule?.location || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-note">메모</Label>
              <Textarea
                id="schedule-note"
                name="note"
                rows={3}
                defaultValue={schedule?.note || ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !applicationId}
            >
              {mutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
