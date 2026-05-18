"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import { BarChart3, CalendarDays, UserRound } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "leave" || tab === "attendance" || tab === "basic") {
      setActiveTab(tab);
    }
  }, []);

  if (isLoading || !profile || !currentMemberId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-6 inline-flex h-auto w-fit rounded-xl bg-[#f1f3f5] p-1">
        <TabsTrigger
          value="basic"
          className="h-9 flex-none rounded-lg px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-[#111111] data-[state=active]:shadow-sm sm:text-sm"
        >
          <UserRound className="h-3.5 w-3.5" />
          기본정보
        </TabsTrigger>
        <TabsTrigger
          value="leave"
          className="h-9 flex-none rounded-lg px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-[#111111] data-[state=active]:shadow-sm sm:text-sm"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          휴가
        </TabsTrigger>
        <TabsTrigger
          value="attendance"
          className="h-9 flex-none rounded-lg px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-[#111111] data-[state=active]:shadow-sm sm:text-sm"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          근태/통계
        </TabsTrigger>
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
