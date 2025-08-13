"use client";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/src/card";
import { Badge } from "@repo/ui/src/badge";
import React, { useState, useEffect } from "react";
import { Button } from "@repo/ui/src/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import Lottery from "@/components/lunch/Lottery";
import LunchGroupList from "@/components/lunch/LunchGroupList";
import { useLunchGroup } from "@/hooks/useLunchGroup";
import { useUsers } from "@/hooks/useUsers";

const Lunch = () => {
  const [userName, setUserName] = useState<string>("");
  const [isLotteryOpen, setIsLotteryOpen] = useState(false);

  const { data: lunchGroupData, isLoading, error } = useLunchGroup();
  const { users: allUsers, isLoading: usersLoading, fetchUsers } = useUsers();
  console.log("lunchGroupData:", lunchGroupData);

  useEffect(() => {
    const name = localStorage.getItem("name");
    if (name) {
      setUserName(name);
    }
  }, []);

  // 유효한 그룹 수 계산
  const getValidGroupCount = () => {
    if (!lunchGroupData?.groups) return 0;
    return lunchGroupData.groups.filter((group) => {
      // 조 번호가 있거나 멤버가 있으면 유효한 그룹으로 간주
      const hasValidGroupNumber = group.groupNumber && group.groupNumber.trim().length > 0;
      const hasAnyMember = group.person && group.person.length > 0;
      return hasValidGroupNumber || hasAnyMember;
    }).length;
  };

  // 미추첨 인원 계산
  const getUnassignedMembers = () => {
    if (!allUsers || allUsers.length === 0 || !lunchGroupData?.groups) return [];
    
    // 모든 점심조에 배정된 멤버들 수집
    const assignedMembers = new Set<string>();
    lunchGroupData.groups.forEach(group => {
      if (group.person) {
        group.person.forEach(member => {
          if (member && typeof member === 'string' && member.trim()) {
            assignedMembers.add(member.trim().toLowerCase());
          }
        });
      }
    });
    
    // 전체 사용자에서 배정된 멤버들 제외
    return allUsers.filter(user => 
      user && user.trim() && !assignedMembers.has(user.trim().toLowerCase())
    );
  };

  const unassignedMembers = getUnassignedMembers();

  return (
    <React.Fragment>
      <div className="pb-14">
        {/* 헤더 */}
        <Card className="bg-white border-none shadow-none mb-4">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-800">점심조 편성</CardTitle>
            <CardDescription>
              {isLoading ? (
                <span className="text-sm text-gray-500">데이터 로딩 중...</span>
              ) : error ? (
                <span className="text-sm text-red-500">데이터 로딩 실패</span>
              ) : (
                <span className="text-sm text-gray-500">
                  총 {getValidGroupCount()}개 조 • {lunchGroupData?.totalMembers || "0"}명
                </span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex space-x-6">
              <div className="">
                <p className="text-xs text-gray-500">시작일</p>
                <p className="text-sm font-medium text-gray-800">{lunchGroupData?.prevDate || "2025.01.06"}</p>
              </div>
              <div className="">
                <p className="text-xs text-gray-500">다음 뽑기</p>
                <p className="text-sm font-medium text-gray-800">{lunchGroupData?.nextDate || "2025.01.13"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button className="w-full text-green-800 mx-auto mb-4 py-6 bg-gradient-to-r from-teal-200 to-lime-200" onClick={() => setIsLotteryOpen(true)}>
          점심조 뽑기
        </Button>
        {/* 조 편성 목록 */}
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Card key={index} className="bg-white border-none shadow-none">
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
                      <div key={memberIndex} className="flex items-center space-x-2 rounded-lg p-2 bg-gray-50">
                        <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"></div>
                        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="bg-white border-none shadow-none">
            <CardContent className="text-center py-8">
              <p className="text-red-500 mb-2">데이터를 불러오는데 실패했습니다.</p>
              <p className="text-sm text-gray-500">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <LunchGroupList groups={lunchGroupData?.groups || []} userName={userName} />
        )}

        <BottomNavigation />
      </div>

      {/* 점심조 뽑기 다이얼로그 */}
      <Dialog open={isLotteryOpen} onOpenChange={setIsLotteryOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">점심조 뽑기</DialogTitle>
            <DialogDescription className="text-center text-gray-600">점심조 뽑기를 위해 카드를 클릭해 주세요.</DialogDescription>
          </DialogHeader>
          <Lottery />

          <DialogFooter className="flex justify-center">
            <Button variant="outline" onClick={() => setIsLotteryOpen(false)} className="w-full py-5">
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default Lunch;
