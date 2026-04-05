"use client";

import React, { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useProfile } from "@/hooks/use-profile";
import ProfileBasicTab from "./ProfileBasicTab";
import ProfileLeaveTab from "./ProfileLeaveTab";
import ProfileAttendanceTab from "./ProfileAttendanceTab";

export default function ProfilePage() {
  const { userName, memberId, hireDate, setMemberInfo } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원", memberLookup.hire_date);
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const currentMemberId = memberId || memberLookup?.id || null;
  const { data: profile, isLoading } = useProfile(currentMemberId);

  if (isLoading || !profile || !currentMemberId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="basic" className="px-4">기본정보</TabsTrigger>
        <TabsTrigger value="leave" className="px-4">휴가</TabsTrigger>
        <TabsTrigger value="attendance" className="px-4">근태/통계</TabsTrigger>
      </TabsList>

      <TabsContent value="basic">
        <ProfileBasicTab
          profile={profile}
          memberId={currentMemberId!}
          hireDate={hireDate}
        />
      </TabsContent>

      <TabsContent value="leave">
        <ProfileLeaveTab
          memberId={currentMemberId!}
          hireDate={hireDate}
        />
      </TabsContent>

      <TabsContent value="attendance">
        <ProfileAttendanceTab
          memberId={currentMemberId!}
          hireDate={hireDate}
        />
      </TabsContent>
    </Tabs>
  );
}
