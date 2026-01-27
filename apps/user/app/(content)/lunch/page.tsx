"use client";
import { BottomNavigation } from "@/components/BottomNavigation";
import GachaMachine from "@/components/lunch/GachaMachine";
import LunchGroupList from "@/components/lunch/LunchGroupList";
import { useLunchGroup } from "@/hooks/useLunchGroup";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";

const WeeklySchedule = dynamic(
  () => import("@/components/lunch/WeeklySchedule"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="w-12 h-3 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="w-16 h-3 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="w-12 h-3 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="w-16 h-3 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    ),
  },
);

const Lunch = () => {
  const [userName, setUserName] = useState<string>("");
  const [isLotteryOpen, setIsLotteryOpen] = useState(false);

  const { data: lunchGroupData, isLoading, error } = useLunchGroup();
  const { users: allUsers, isLoading: usersLoading, fetchUsers } = useUsers();

  useEffect(() => {
    const name = localStorage.getItem("name");
    fetchUsers();
    if (name) {
      setUserName(name);
    }
  }, [fetchUsers]);

  // 유효한 그룹 수 계산 (memoized)
  const validGroupCount = useMemo(() => {
    if (!lunchGroupData?.groups) return 0;
    return lunchGroupData.groups.filter((group) => {
      const hasValidGroupNumber =
        group.groupNumber && group.groupNumber.trim().length > 0;
      const hasAnyMember = group.person && group.person.length > 0;
      return hasValidGroupNumber || hasAnyMember;
    }).length;
  }, [lunchGroupData?.groups]);

  // 미추첨 인원 계산 (memoized)
  const unassignedMembers = useMemo(() => {
    if (!allUsers || allUsers.length === 0 || !lunchGroupData?.groups)
      return [];

    // 제외할 인원 목록
    const excludedMembers = new Set(["정진우", "장문경", "이서현"]);

    // 제외할 인원 목록
    const excludedMembers = new Set(['정진우', '장문경', '이서현']);

    // 모든 점심조에 배정된 멤버들 수집
    const assignedMembers = new Set<string>();
    lunchGroupData.groups.forEach((group) => {
      if (group.person) {
        group.person.forEach((member) => {
          if (member && typeof member === "string" && member.trim()) {
            assignedMembers.add(member.trim().toLowerCase());
          }
        });
      }
    });

    // 전체 사용자에서 배정된 멤버들과 제외 대상자들 제외
    return allUsers.filter(
      (user) =>
        user &&
        user.trim() &&
        !assignedMembers.has(user.trim().toLowerCase()) &&
        !excludedMembers.has(user.trim()),
    );
  }, [allUsers, lunchGroupData?.groups]);

  return (
    <React.Fragment>
      {/* 헤더 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden"
      >
        {/* 상단 헤더 */}
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                점심조 편성
              </h1>
              {isLoading ? (
                <p className="text-xs text-gray-400 mt-0.5">로딩 중...</p>
              ) : error ? (
                <p className="text-xs text-red-500 mt-0.5">데이터 로딩 실패</p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">
                  총 {validGroupCount}개 조 ·{" "}
                  {lunchGroupData?.totalMembers || "0"}명
                </p>
              )}
            </div>

            {/* 미추첨 인원 Popover */}
            {!isLoading && !error && unassignedMembers.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    미추첨 {unassignedMembers.length}명
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <div className="p-4 border-b border-gray-100">
                    <h4 className="font-medium text-sm text-gray-900">
                      미추첨 인원
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      아직 점심조에 배정되지 않은 인원
                    </p>
                  </div>

                  <div className="p-3 max-h-52 overflow-y-auto">
                    {usersLoading ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        로딩 중...
                      </p>
                    ) : unassignedMembers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        모든 인원이 배정됨
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {unassignedMembers.map((member, index) => (
                          <div
                            key={`unassigned-${index}`}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {member.charAt(0)}
                            </div>
                            <span className="text-xs text-gray-700 truncate">
                              {member}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-400 text-center">
                      총 {unassignedMembers.length}명 미배정
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* 일정 정보 */}
        <div className="px-5 py-4">
          <div className="flex gap-8 mb-4">
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5">시작일</p>
              <p className="text-sm font-medium text-gray-800">
                {lunchGroupData?.prevDate || "-"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5">다음 뽑기</p>
              <p className="text-sm font-medium text-gray-800">
                {lunchGroupData?.nextDate || "-"}
              </p>
            </div>
          </div>

          {/* 주간 식사 정보 */}
          <WeeklySchedule isLoading={isLoading} />
        </div>
      </motion.div>

      {/* 점심조 뽑기 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          className="w-full mb-4 py-3.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
          onClick={() => setIsLotteryOpen(true)}
        >
          점심조 뽑기
        </button>
      </motion.div>

      {/* 조 편성 목록 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-100 p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="skeleton h-6 w-12 rounded-lg" />
                  <div className="skeleton h-4 w-16 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="skeleton w-6 h-6 rounded-full" />
                      <div className="skeleton h-4 w-14 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-red-500 mb-1">
              데이터를 불러오는데 실패했습니다
            </p>
            <p className="text-xs text-gray-400">
              {error?.message || "알 수 없는 오류"}
            </p>
          </div>
        ) : (
          <LunchGroupList
            groups={lunchGroupData?.groups || []}
            userName={userName}
          />
        )}
      </motion.div>

      <BottomNavigation />

      {/* 점심조 뽑기 다이얼로그 */}
      <Dialog open={isLotteryOpen} onOpenChange={setIsLotteryOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-gray-100">
            <DialogTitle className="text-base font-semibold text-gray-900">
              점심조 뽑기
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              뽑기 버튼을 눌러 점심조를 뽑아주세요
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 max-h-[70vh] overflow-y-auto flex items-center justify-center">
            <GachaMachine />
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <Button
              variant="outline"
              onClick={() => setIsLotteryOpen(false)}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default Lunch;
