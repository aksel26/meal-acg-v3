"use client";

import React, { useCallback, useEffect, useState } from "react";
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
      setMemberInfo(
        memberLookup.id,
        memberLookup.member_role || "팀원",
        memberLookup.hire_date,
      );
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

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);

    const params = new URLSearchParams(window.location.search);
    if (tab === "basic") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const nextUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  if (isLoading || !profile || !currentMemberId) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-slate-400">로딩 중...</span>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4 inline-flex h-auto w-fit rounded-xl bg-slate-100 p-1">
        <TabsTrigger
          value="basic"
          className="h-8 flex-none rounded-lg px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-950"
        >
          기본정보
        </TabsTrigger>
        <TabsTrigger
          value="leave"
          className="h-8 flex-none rounded-lg px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-950"
        >
          휴가
        </TabsTrigger>
        <TabsTrigger
          value="attendance"
          className="h-8 flex-none rounded-lg px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-950"
        >
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
        <ProfileLeaveTab memberId={currentMemberId!} hireDate={hireDate} />
      </TabsContent>

      <TabsContent value="attendance">
        <ProfileAttendanceTab memberId={currentMemberId!} hireDate={hireDate} />
      </TabsContent>
    </Tabs>
  );
}
