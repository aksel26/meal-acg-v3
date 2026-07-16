"use client";

import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import ProfileAttendanceTab from "../profile/ProfileAttendanceTab";

export default function AttendanceStatsPage() {
  const { userName, memberId } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);
  const currentMemberId = memberId ?? memberLookup?.id ?? null;

  if (!currentMemberId) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-400">
        로딩 중...
      </div>
    );
  }

  return <ProfileAttendanceTab memberId={currentMemberId} />;
}
