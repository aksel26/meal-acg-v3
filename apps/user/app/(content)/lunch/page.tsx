"use client";
import LunchGroupList from "@/components/lunch/LunchGroupList";
import { useLunchGroup } from "@/hooks/useLunchGroup";
import { useUsers } from "@/hooks/useUsers";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import QuickActionsSection from "@/components/dashboard/QuickActionsSection";

const ScratchLottery = dynamic(
  () => import("@/components/lunch/ScratchLottery"),
  { ssr: false },
);

const WeeklySchedule = dynamic(
  () => import("@/components/lunch/WeeklySchedule"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--soft-bone)] rounded-xl p-3">
          <div className="w-12 h-3 skeleton rounded mb-2"></div>
          <div className="w-16 h-3 skeleton rounded"></div>
        </div>
        <div className="bg-[var(--soft-bone)] rounded-xl p-3">
          <div className="w-12 h-3 skeleton rounded mb-2"></div>
          <div className="w-16 h-3 skeleton rounded"></div>
        </div>
      </div>
    ),
  },
);

const Lunch = () => {
  const [userName, setUserName] = useState<string>("");

  const { data: lunchGroupData, isLoading, error } = useLunchGroup();
  const { users: allUsers, isLoading: usersLoading, fetchUsers } = useUsers();

  useEffect(() => {
    const name = localStorage.getItem("name");
    fetchUsers();
    if (name) {
      setUserName(name);
    }
  }, [fetchUsers]);

  // 제외 대상 여부 계산
  const isExcluded = useMemo(() => {
    if (!userName || !lunchGroupData?.excludedMembers) return false;
    return lunchGroupData.excludedMembers.includes(userName);
  }, [userName, lunchGroupData?.excludedMembers]);

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

    // 제외할 인원 목록 (DB에서 조회)
    const excludedMembers = new Set(lunchGroupData?.excludedMembers || []);

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
  }, [allUsers, lunchGroupData?.excludedMembers, lunchGroupData?.groups]);

  return (
    <React.Fragment>
      <div className="grid gap-4 lg:h-[calc(100dvh-10rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:overflow-hidden">
        <div className="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          {/* 헤더 카드 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card-premium overflow-hidden rounded-[24px]"
          >
            {/* 상단 헤더 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-lg font-medium text-[var(--ink-black)]">
                    점심조 편성
                  </h1>
                  {isLoading ? (
                    <p className="mt-0.5 text-xs text-[var(--slate-gray)]">
                      로딩 중...
                    </p>
                  ) : error ? (
                    <p className="mt-0.5 text-xs text-[var(--danger)]">
                      데이터 로딩 실패
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[var(--granite)]">
                      총 {validGroupCount}개 조 ·{" "}
                      {lunchGroupData?.totalMembers || "0"}명
                    </p>
                  )}
                </div>

                {/* 미추첨 인원 Popover */}
                {!isLoading && !error && unassignedMembers.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="shrink-0 rounded-full bg-[rgba(236,126,0,0.12)] px-3 py-1.5 text-xs font-medium text-[#9a4f00] transition-colors hover:bg-[rgba(236,126,0,0.18)]">
                        미추첨 {unassignedMembers.length}명
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-72 overflow-hidden rounded-[20px] border-0 p-0"
                      align="end"
                    >
                      <div className="p-4">
                        <h4 className="text-sm font-medium text-[var(--ink-black)]">
                          미추첨 인원
                        </h4>
                        <p className="mt-0.5 text-xs text-[var(--granite)]">
                          아직 점심조에 배정되지 않은 인원
                        </p>
                      </div>

                      <div className="max-h-52 overflow-y-auto px-3 pb-3">
                        {usersLoading ? (
                          <p className="py-4 text-center text-sm text-[var(--slate-gray)]">
                            로딩 중...
                          </p>
                        ) : unassignedMembers.length === 0 ? (
                          <p className="py-4 text-center text-sm text-[var(--granite)]">
                            모든 인원이 배정됨
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {unassignedMembers.map((member, index) => (
                              <div
                                key={`unassigned-${index}`}
                                className="flex items-center gap-2 rounded-[14px] bg-[rgba(244,241,232,0.58)] p-2"
                              >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium text-[var(--granite)]">
                                  {member.charAt(0)}
                                </div>
                                <span className="truncate text-xs text-[var(--granite)]">
                                  {member}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-[var(--whisper-cream)] px-4 py-3">
                        <p className="text-center text-xs text-[var(--slate-gray)]">
                          총 {unassignedMembers.length}명 미배정
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* 일정 정보 */}
            <div className="px-5 pb-5">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3">
                  <p className="mb-0.5 text-[11px] text-[var(--slate-gray)]">
                    시작일
                  </p>
                  <p className="text-sm font-medium text-[var(--ink-black)]">
                    {lunchGroupData?.prevDate || "-"}
                  </p>
                </div>
                <div className="rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3">
                  <p className="mb-0.5 text-[11px] text-[var(--slate-gray)]">
                    다음 뽑기
                  </p>
                  <p className="text-sm font-medium text-[var(--ink-black)]">
                    {lunchGroupData?.nextDate || "-"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 월/금 고정 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="card-premium order-3 shrink-0 rounded-[24px] px-5 py-4 lg:order-none"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-[var(--ink-black)]">
                  고정 점심 정보
                </h2>
                <p className="mt-0.5 text-xs text-[var(--granite)]">
                  월요일 · 금요일 고정 스케줄
                </p>
              </div>
            </div>
            <WeeklySchedule
              isLoading={isLoading}
              mondayMember={lunchGroupData?.mondayMember}
              fridayMember={lunchGroupData?.fridayMember}
              excludedMembers={lunchGroupData?.excludedMembers}
            />
          </motion.div>

          {/* 점심조 뽑기 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="order-2 lg:order-none"
          >
            <div className="card-premium rounded-[24px] px-5 py-3">
              <div>
                <h2 className="text-sm font-medium text-[var(--ink-black)]">
                  점심조 뽑기
                </h2>
                <p className="mt-0.5 text-xs text-[var(--granite)]">
                  스티커를 흔들어 배정된 조를 확인하세요
                </p>
              </div>

              {isExcluded ? (
                <div className="rounded-[18px] bg-[var(--whisper-cream)] px-4 py-5 text-center text-sm font-medium text-[var(--slate-gray)]">
                  이번주 점심조 배정 대상이 아닙니다
                </div>
              ) : (
                <ScratchLottery />
              )}
            </div>
          </motion.div>
        </div>

        {/* 조 편성 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 lg:h-full lg:min-h-0"
        >
          <div className="flex min-h-full flex-col gap-3 lg:h-full lg:min-h-0">
            <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
              {isLoading ? (
                // 로딩 스켈레톤
                <div className="space-y-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="card-premium rounded-[24px] p-4"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="skeleton h-6 w-12 rounded-lg" />
                        <div className="skeleton h-4 w-16 rounded" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }, (_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-[14px] bg-[var(--whisper-cream)] p-2"
                          >
                            <div className="skeleton h-6 w-6 rounded-full" />
                            <div className="skeleton h-4 w-14 rounded" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="card-premium rounded-[24px] p-8 text-center">
                  <p className="mb-1 text-sm text-[var(--danger)]">
                    데이터를 불러오는데 실패했습니다
                  </p>
                  <p className="text-xs text-[var(--slate-gray)]">
                    {error?.message || "알 수 없는 오류"}
                  </p>
                </div>
              ) : (
                <LunchGroupList
                  groups={lunchGroupData?.groups || []}
                  userName={userName}
                />
              )}
            </div>

            <div className="shrink-0">
              <QuickActionsSection excludeIds={["lunch"]} />
            </div>
          </div>
        </motion.div>
      </div>
    </React.Fragment>
  );
};

export default Lunch;
