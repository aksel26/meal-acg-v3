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
import { toast } from "@repo/ui/src/sonner";
import {
  careersApi,
  careersKeys,
  useCareersMutation,
} from "@/hooks/useCareersApi";

export function ScheduleFinalResultDialog({
  application,
  onOpenChange,
}: {
  application: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [result, setResult] = useState<"hired" | "rejected">("hired");
  const [reason, setReason] = useState("");
  const mutation = useCareersMutation(
    (body: { result: typeof result; reason?: string }) =>
      careersApi.finalResult(application!.id, body),
    [careersKeys.schedules(), careersKeys.dashboard, careersKeys.all],
  );

  useEffect(() => {
    if (application) {
      setResult("hired");
      setReason("");
    }
  }, [application]);

  async function save() {
    if (!application) return;
    try {
      await mutation.mutateAsync({
        result,
        reason: reason.trim() || undefined,
      });
      toast.success("최종 결과를 저장했습니다.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    }
  }

  return (
    <Dialog open={Boolean(application)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>최종 결과 입력</DialogTitle>
          <DialogDescription>{application?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>결과</Label>
            <Select
              value={result}
              onValueChange={(value) => setResult(value as typeof result)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hired">합격</SelectItem>
                <SelectItem value="rejected">불합격</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-result-reason">메모 또는 사유</Label>
            <Input
              id="schedule-result-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={mutation.isPending} onClick={() => void save()}>
            {mutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
