"use client";
import QuickActionsSection from "@/components/dashboard/QuickActionsSection";
import LunchGroupList from "@/components/lunch/LunchGroupList";
import StateBlock from "@/components/StateBlock";
import { useLunchGroup } from "@/hooks/useLunchGroup";
import { useUsers } from "@/hooks/useUsers";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { Hourglass } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";

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

  const { data: lunchGroupData, isLoading, error, refetch } = useLunchGroup();
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

  // 이미 배정된 내 조 번호 (없으면 null)
  const myGroupNumber = useMemo(() => {
    if (!userName || !lunchGroupData?.groups) return null;
    const name = userName.trim();
    const group = lunchGroupData.groups.find((g) =>
      g.person?.some((p) => p && p.trim() === name),
    );
    const number = group ? parseInt(group.groupNumber, 10) : NaN;
    return Number.isFinite(number) ? number : null;
  }, [userName, lunchGroupData?.groups]);

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
      <div className="grid gap-4 pb-24 lg:h-[calc(100dvh-10rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:overflow-hidden lg:pb-0">
        {/* @repo/ui CSS가 뒤에 로드되며 .flex를 다시 정의해 lg:grid를 덮으므로, flex는 lg 미만에만 건다 */}
        <div className="min-w-0 gap-3 max-lg:flex max-lg:flex-col lg:grid lg:h-full lg:min-h-0 lg:grid-cols-1 lg:content-start lg:overflow-y-auto lg:pr-1">
          {/* 헤더 카드 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card-premium relative shrink-0 overflow-hidden"
          >
            {/* 상단 헤더 */}
            <div className="px-5 py-4">
              {error ? (
                <StateBlock
                  title="점심조 정보를 불러오지 못했어요"
                  description="연결을 확인하고 다시 시도해 주세요."
                  action={{ label: "다시 시도", onClick: () => void refetch() }}
                />
              ) : (
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 ${
                    !isLoading && !error && unassignedMembers.length > 0 ? "pr-16" : ""
                  }`}
                >
                  <div className="min-w-0">
                    {isLoading ? (
                      <div className="skeleton h-7 w-40" />
                    ) : (
                      <h1 className="text-lg font-medium tabular-nums text-[var(--ink-black)]">
                        총 {validGroupCount}개 조 ·{" "}
                        {lunchGroupData?.totalMembers || "0"}명
                      </h1>
                    )}
                  </div>

                  {!isLoading && !error && (
                    <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-[var(--slate-gray)]">
                      <span>시작일 {lunchGroupData?.prevDate || "-"}</span>
                      <span className="text-[rgba(25,28,31,0.22)]">·</span>
                      <span>다음 뽑기 {lunchGroupData?.nextDate || "-"}</span>
                    </div>
                  )}

                  {/* 미추첨 인원 Popover: 카드 우측 상단 아이콘 버튼 */}
                  {!isLoading && !error && unassignedMembers.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={`미추첨 ${unassignedMembers.length}명`}
                          title="미추첨 인원"
                          className="absolute right-4 top-2.5 inline-flex h-8 items-center gap-1 rounded-full bg-[rgba(236,126,0,0.12)] px-3 text-xs font-medium tabular-nums text-[#9a4f00] transition-colors hover:bg-[rgba(236,126,0,0.18)]"
                        >
                          <Hourglass size={14} aria-hidden="true" />
                          {unassignedMembers.length}
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
                            <div className="grid grid-cols-2 gap-2">
                              {Array.from({ length: 4 }, (_, i) => (
                                <div key={i} className="skeleton h-10 rounded-[18px]" />
                              ))}
                            </div>
                          ) : unassignedMembers.length === 0 ? (
                            <p className="py-4 text-center text-sm text-[var(--granite)]">
                              모든 인원이 배정됨
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {unassignedMembers.map((member, index) => (
                                <div
                                  key={`unassigned-${index}`}
                                  className="flex items-center gap-2 rounded-[18px] bg-[rgba(244,244,244,0.58)] p-2"
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
              )}
            </div>
          </motion.div>

          {/* 점심조 뽑기 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:row-start-3"
          >
            <div className="card-premium px-5 py-4">
              <div>
                <h2 className="text-sm font-medium text-[var(--ink-black)]">
                  점심조 뽑기
                </h2>
                <p className="mt-0.5 text-xs text-[var(--granite)]">
                  {myGroupNumber !== null
                    ? "이번 주 조가 이미 배정되어 있습니다."
                    : "스티커를 클릭해 점심조를 배정하세요."}
                </p>
              </div>

              {isExcluded ? (
                <div className="rounded-[18px] bg-[var(--whisper-cream)] px-4 py-5 text-center text-sm font-medium text-[var(--slate-gray)]">
                  이번주 점심조 배정 대상이 아닙니다
                </div>
              ) : (
                <ScratchLottery assignedGroupNumber={myGroupNumber} />
              )}
            </div>
          </motion.div>

          {/* 월/금 고정 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="card-premium shrink-0 px-5 py-4 lg:row-start-2"
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
        </div>

        {/* 조 편성 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden"
        >
          <div className="flex min-h-0 flex-col gap-3 lg:h-full lg:min-h-0">
            <div className="min-h-0 flex-1 overflow-hidden lg:pr-1">
              {isLoading ? (
                // 로딩 스켈레톤
                <div className="h-full space-y-3 overflow-y-auto">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="card-premium p-4"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="skeleton h-6 w-12 rounded-lg" />
                        <div className="skeleton h-4 w-16 rounded" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }, (_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-[18px] bg-[var(--whisper-cream)] p-2"
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
                <StateBlock
                  title="점심조 목록을 불러오지 못했어요"
                  description="위쪽 카드의 다시 시도를 눌러 주세요."
                  className="card-premium h-full"
                />
              ) : (
                <div className="h-full overflow-y-auto">
                  <LunchGroupList
                    groups={lunchGroupData?.groups || []}
                    userName={userName}
                  />
                </div>
              )}
            </div>

            <div className="h-[4.25rem] w-full shrink-0 max-lg:hidden">
              <QuickActionsSection />
            </div>
          </div>
        </motion.div>
      </div>

    </React.Fragment>
  );
};

export default Lunch;
