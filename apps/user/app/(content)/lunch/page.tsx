"use client";
import { BottomNavigation } from "@/components/BottomNavigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import { Badge } from "@repo/ui/src/badge";
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import Lottery from "@/components/lunch/Lottery";
import LunchGroupList from "@/components/lunch/LunchGroupList";
import { useLunchGroup } from "@/hooks/useLunchGroup";
import { useUsers } from "@/hooks/useUsers";
import { motion } from "motion/react";

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

    // 전체 사용자에서 배정된 멤버들 제외
    return allUsers.filter(
      (user) =>
        user && user.trim() && !assignedMembers.has(user.trim().toLowerCase())
    );
  }, [allUsers, lunchGroupData?.groups]);

  return (
    <React.Fragment>
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.1,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Card className="bg-white border-none shadow-none mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg sm:text-xl! font-semibold text-gray-800">
                  점심조 편성
                </p>
                <CardDescription>
                  {isLoading ? (
                    <span className="text-sm text-gray-500">
                      데이터 로딩 중...
                    </span>
                  ) : error ? (
                    <span className="text-sm text-red-500">
                      데이터 로딩 실패
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-gray-500">
                      총 {validGroupCount}개 조 •{" "}
                      {lunchGroupData?.totalMembers || "0"}명
                    </span>
                  )}
                </CardDescription>
              </div>

              {/* 미추첨 인원 Popover */}
              {!isLoading && !error && unassignedMembers.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
                    >
                      <span className="mr-2">⚠️</span>
                      미추첨 {unassignedMembers.length}명
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-gray-900 mb-1">
                          미추첨 인원
                        </h4>
                        <p className="text-xs text-gray-500">
                          아직 점심조에 배정되지 않은 인원입니다
                        </p>
                      </div>

                      {usersLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="text-sm text-gray-500">
                            로딩 중...
                          </div>
                        </div>
                      ) : unassignedMembers.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          모든 인원이 배정되었습니다
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                          {unassignedMembers.map((member, index) => (
                            <div
                              key={`unassigned-${index}`}
                              className="flex items-center space-x-2 p-2 bg-orange-50 rounded-lg border border-orange-100"
                            >
                              <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center text-xs font-medium text-orange-700">
                                {member.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs sm:text-sm text-gray-700 truncate">
                                {member}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {unassignedMembers.length > 0 && (
                        <div className="pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-400 text-center">
                            총 {unassignedMembers.length}명이 미배정 상태입니다
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex space-x-6">
              <div className="">
                <p className="text-xs text-gray-500">시작일</p>
                <p className="text-xs font-medium text-gray-800">
                  {lunchGroupData?.prevDate || "2025.01.06"}
                </p>
              </div>
              <div className="">
                <p className="text-xs text-gray-500">다음 뽑기</p>
                <p className="text-xs font-medium text-gray-800">
                  {lunchGroupData?.nextDate || "2025.01.13"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Button
          className="w-full text-green-800 mx-auto mb-4 py-6 bg-gradient-to-r from-teal-200 to-lime-200"
          onClick={() => setIsLotteryOpen(true)}
        >
          점심조 뽑기
        </Button>
      </motion.div>
      {/* 조 편성 목록 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <Card className="bg-white border-none shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 4 }, (_, memberIndex) => (
                        <div
                          key={memberIndex}
                          className="flex items-center space-x-2 rounded-lg p-2 bg-gray-50"
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"></div>
                          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : error ? (
          <Card className="bg-white border-none shadow-none">
            <CardContent className="text-center py-8">
              <p className="text-red-500 mb-2">
                데이터를 불러오는데 실패했습니다.
              </p>
              <p className="text-sm text-gray-500">
                {error?.message || "알 수 없는 오류가 발생했습니다."}
              </p>
            </CardContent>
          </Card>
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
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-xl! font-semibold text-center">
              점심조 뽑기
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              점심조 뽑기를 위해 카드를 클릭해 주세요.
            </DialogDescription>
          </DialogHeader>
          <Lottery />

          <DialogFooter className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setIsLotteryOpen(false)}
              className="w-full py-5 text-xs sm:text-sm"
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
