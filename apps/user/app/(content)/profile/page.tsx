"use client";

import { useEffect } from "react";
import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useProfile } from "@/hooks/use-profile";
import ProfileBasicTab from "./ProfileBasicTab";

export default function ProfilePage() {
  const { userName, memberId, hireDate, setMemberInfo } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(
        memberLookup.id,
        memberLookup.member_role || "팀원",
        memberLookup.hire_date,
      );
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const currentMemberId = memberId || memberLookup?.id || null;
  const { data: profile, isLoading } = useProfile(currentMemberId);
  if (isLoading || !profile || !currentMemberId) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-slate-400">로딩 중...</span>
      </div>
    );
  }

  return (
    <ProfileBasicTab
      profile={profile}
      memberId={currentMemberId}
      hireDate={hireDate}
    />
  );
}
