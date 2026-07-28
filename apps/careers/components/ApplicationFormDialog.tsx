"use client";

import { useEffect, useState } from "react";
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
  type ApplicationDetail,
  type Gender,
  type JobPosting,
  useCareersMutation,
  usePostings,
} from "@/hooks/useCareersApi";
import { todayInSeoul } from "@/lib/careers/date";

const PLATFORMS = [
  "사람인",
  "잡코리아",
  "워크넷",
  "인크루트",
  "링크드인",
  "직접지원",
  "기타",
] as const;

export function ApplicationFormDialog({
  open,
  onOpenChange,
  postings = [],
  defaultPostingId,
  application,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postings?: JobPosting[];
  defaultPostingId?: string;
  application?: ApplicationDetail;
}) {
  const fetchedPostings = usePostings();
  const postingOptions =
    postings.length > 0 ? postings : fetchedPostings.data?.items || [];
  const availablePostings =
    application?.posting &&
    !postingOptions.some((posting) => posting.id === application.postingId)
      ? [application.posting, ...postingOptions]
      : postingOptions;
  const firstPostingId = availablePostings[0]?.id || "";
  const [postingId, setPostingId] = useState(
    application?.postingId || defaultPostingId || firstPostingId,
  );
  const [gender, setGender] = useState<Gender | "">(application?.gender || "");
  const [platform, setPlatform] = useState(
    application?.platform || application?.source || "",
  );
  const mutation = useCareersMutation(
    (body: Record<string, unknown>) =>
      application
        ? careersApi.updateApplication(application.id, body)
        : careersApi.createApplication(body),
    application
      ? [careersKeys.application(application.id), careersKeys.all]
      : [careersKeys.all],
  );

  useEffect(() => {
    if (!open) return;
    setPostingId(application?.postingId || defaultPostingId || firstPostingId);
    setGender(application?.gender || "");
    setPlatform(application?.platform || application?.source || "");
  }, [application, defaultPostingId, firstPostingId, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!gender) {
      toast.error("성별을 선택해 주세요.");
      return;
    }
    const schoolName = String(data.get("schoolName") || "").trim();
    const major = String(data.get("major") || "").trim();
    const applicant = {
      postingId,
      name: data.get("name"),
      platform,
      gender,
      birthDate: data.get("birthDate") || "",
      email: data.get("email") || "",
      phone: data.get("phone") || "",
      region: data.get("region") || "",
      regionDetail: data.get("regionDetail") || "",
      address: data.get("address") || "",
      memo: data.get("memo") || "",
      educations:
        schoolName || major
          ? [
              {
                schoolName,
                degree: "대학교",
                period: "",
                majorField: "",
                major,
                gpa: 0,
                gpaMax: 4.5,
              },
            ]
          : [],
    };

    try {
      await mutation.mutateAsync(
        application
          ? {
              ...applicant,
              appliedAt: data.get("appliedAt")
                ? new Date(String(data.get("appliedAt"))).toISOString()
                : application.appliedAt,
            }
          : {
              ...applicant,
              appliedAt: data.get("appliedAt")
                ? new Date(String(data.get("appliedAt"))).toISOString()
                : new Date().toISOString(),
            },
      );
      toast.success(
        application ? "지원자 정보를 수정했습니다." : "지원자를 등록했습니다.",
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    }
  }

  const education = application?.educations[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {application ? "지원자 정보 수정" : "지원자 등록"}
          </DialogTitle>
          <DialogDescription>
            이름과 성별은 필수입니다. 나머지 항목은 확인된 정보만 입력할 수
            있습니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>지원 공고</Label>
              <Select value={postingId} onValueChange={setPostingId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="공고 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availablePostings.map((posting) => (
                    <SelectItem key={posting.id} value={posting.id}>
                      {posting.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              id="applicant-applied"
              label="지원일"
              name="appliedAt"
              type="date"
              defaultValue={
                application?.appliedAt.slice(0, 10) || todayInSeoul()
              }
            />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">기본 정보</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field
                id="applicant-name"
                label="이름"
                name="name"
                defaultValue={application?.applicantName}
                maxLength={100}
                required
              />
              <div className="space-y-2">
                <Label>성별</Label>
                <Select
                  value={gender}
                  onValueChange={(value) => setGender(value as Gender)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="성별 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="남성">남성</SelectItem>
                    <SelectItem value="여성">여성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field
                id="applicant-birth"
                label="생년월일"
                name="birthDate"
                type="date"
                defaultValue={application?.birthDate}
              />
              <div className="space-y-2">
                <Label>지원 플랫폼</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="지원 플랫폼 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                id="applicant-email"
                label="이메일"
                name="email"
                type="email"
                defaultValue={application?.email}
                maxLength={320}
              />
              <Field
                id="applicant-phone"
                label="연락처"
                name="phone"
                defaultValue={application?.phone}
                maxLength={30}
              />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">주소</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field
                id="applicant-region"
                label="지역"
                name="region"
                defaultValue={application?.region}
                placeholder="예: 서울"
              />
              <Field
                id="applicant-region-detail"
                label="세부 지역"
                name="regionDetail"
                defaultValue={application?.regionDetail}
                placeholder="예: 강남구"
              />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="applicant-address">상세 주소</Label>
                <Input
                  id="applicant-address"
                  name="address"
                  defaultValue={application?.address}
                  maxLength={500}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">학력</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field
                id="applicant-school"
                label="학교"
                name="schoolName"
                defaultValue={education?.schoolName}
                maxLength={200}
              />
              <Field
                id="applicant-major"
                label="전공"
                name="major"
                defaultValue={education?.major}
                maxLength={200}
              />
            </div>
          </section>

          <div className="space-y-2">
            <Label htmlFor="applicant-memo">메모</Label>
            <Textarea
              id="applicant-memo"
              name="memo"
              rows={4}
              defaultValue={application?.applicantMemo || ""}
              maxLength={10_000}
            />
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
              disabled={mutation.isPending || !gender || !postingId}
            >
              {mutation.isPending
                ? "저장 중..."
                : application
                  ? "수정"
                  : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}
