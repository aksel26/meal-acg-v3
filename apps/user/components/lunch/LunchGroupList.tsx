"use client";
import React, { useMemo, useCallback } from "react";
import { LunchGroup } from "@/hooks/useLunchGroup";
import { motion } from "motion/react";

interface LunchGroupListProps {
  groups: LunchGroup[];
  userName: string;
  onTeamClick?: (groupNumber: string, members: string[]) => void;
}

interface ProcessedTeam {
  id: number;
  name: string;
  members: { member: string; isEmpty: boolean }[];
  rawGroupNumber: string;
}

// 멤버 데이터를 처리하는 유틸리티 함수 (빈 문자열도 포함하되 구분)
const processMemberData = (
  data: string[],
): { member: string; isEmpty: boolean }[] => {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const isEmpty =
      !item || typeof item !== "string" || item.trim().length === 0;
    return {
      member: isEmpty ? "" : item.trim(),
      isEmpty,
    };
  });
};

// 조 번호를 파싱하고 정리하는 함수
const parseGroupNumber = (
  groupNumber: string,
): { id: number; displayName: string } => {
  if (!groupNumber || typeof groupNumber !== "string") {
    return { id: 0, displayName: "미분류" };
  }

  const trimmed = groupNumber.trim();

  // 숫자만 추출 (예: "1조", "조1", "1" 모두 1로 변환)
  const numberMatch = trimmed.match(/\d+/);
  const number = numberMatch ? parseInt(numberMatch[0]) : 0;

  // 조 이름 생성
  const displayName = number > 0 ? `${number}조` : trimmed || "미분류";

  return { id: number, displayName };
};

// 팀 데이터를 처리하고 정리하는 함수
const processTeamData = (groups: LunchGroup[]): ProcessedTeam[] => {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups
    .map((group, index) => {
      // 멤버 데이터 처리 (빈 문자열도 포함)
      const processedMembers = processMemberData(group.person || []);

      // 조 번호가 없거나 모든 멤버가 비어있는 경우에만 제외
      const hasValidGroupNumber =
        group.groupNumber && group.groupNumber.trim().length > 0;
      const hasAnyMember = processedMembers.length > 0;

      if (!hasValidGroupNumber && !hasAnyMember) {
        return null;
      }

      const { id, displayName } = parseGroupNumber(group.groupNumber);

      return {
        id: id || index + 1, // id가 0이면 인덱스 기반으로 설정
        name: displayName,
        members: processedMembers,
        rawGroupNumber: group.groupNumber || "",
      };
    })
    .filter((team): team is ProcessedTeam => team !== null) // null 제거
    .sort((a, b) => {
      // ID 순으로 정렬 (미분류는 맨 뒤로)
      if (a.id === 0 && b.id !== 0) return 1;
      if (a.id !== 0 && b.id === 0) return -1;
      return a.id - b.id;
    });
};

const LunchGroupList: React.FC<LunchGroupListProps> = ({
  groups,
  userName,
  onTeamClick,
}) => {
  // 데이터 처리 (memoized)
  const processedTeams = useMemo(() => processTeamData(groups), [groups]);

  // 내 팀 체크 함수 (memoized)
  const isMyTeam = useCallback(
    (members: { member: string; isEmpty: boolean }[]) => {
      return (
        userName &&
        members.some(
          ({ member, isEmpty }) =>
            !isEmpty &&
            member.trim().toLowerCase() === userName.trim().toLowerCase(),
        )
      );
    },
    [userName],
  );

  // 내 팀을 맨 앞으로 정렬 (memoized)
  const sortedTeams = useMemo(() => {
    return [...processedTeams].sort((a, b) => {
      const aIsMyTeam = isMyTeam(a.members);
      const bIsMyTeam = isMyTeam(b.members);

      if (aIsMyTeam && !bIsMyTeam) return -1;
      if (!aIsMyTeam && bIsMyTeam) return 1;
      return a.id - b.id;
    });
  }, [processedTeams, isMyTeam]);

  // 빈 데이터 처리
  if (processedTeams.length === 0) {
    return (
      <div className="card-premium rounded-[24px] p-8 text-center">
        <p className="mb-1 text-sm text-[var(--granite)]">
          등록된 점심조가 없습니다.
        </p>
        <p className="text-xs text-[var(--slate-gray)]">
          관리자에게 문의해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {sortedTeams.map((team, index) => {
        const isMyTeamHighlight = isMyTeam(team.members);
        const validMemberCount = team.members.filter((m) => !m.isEmpty).length;

        return (
          <motion.div
            key={`${team.rawGroupNumber}-${team.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`card-premium overflow-hidden rounded-[24px] transition-all duration-200 ${
              isMyTeamHighlight ? "ring-1 ring-[rgba(14,15,12,0.24)]" : ""
            } ${onTeamClick ? "cursor-pointer" : ""}`}
            onClick={() =>
              onTeamClick?.(
                team.rawGroupNumber,
                team.members.map((m) => m.member),
              )
            }
          >
            {/* 헤더 */}
            <div className="px-3 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      isMyTeamHighlight
                        ? "bg-[var(--ink-black)] text-white"
                        : "bg-[var(--whisper-cream)] text-[var(--granite)]"
                    }`}
                  >
                    {team.name}
                  </span>
                  <span className="text-xs text-[var(--slate-gray)]">
                    {validMemberCount}명
                  </span>
                </div>
                {isMyTeamHighlight && (
                  <span className="rounded-full bg-[rgba(236,126,0,0.12)] px-2.5 py-1 text-[10px] font-medium text-[#9a4f00]">
                    내 조
                  </span>
                )}
              </div>
            </div>

            {/* 멤버 목록 */}
            <div className="p-3 pt-0">
              <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
                {team.members.map(({ member, isEmpty }, memberIndex) => {
                  const isMe =
                    userName &&
                    !isEmpty &&
                    member.trim().toLowerCase() ===
                      userName.trim().toLowerCase();

                  if (isEmpty) {
                    // 빈 슬롯 UI
                    return (
                      <div
                        key={`empty-${memberIndex}`}
                        className="flex items-center gap-2 rounded-[14px] bg-[rgba(244,241,232,0.45)] p-2"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                          <span className="text-[10px] text-[var(--slate-gray)]">
                            ?
                          </span>
                        </div>
                        <span className="text-xs italic text-[var(--slate-gray)]">
                          빈 자리
                        </span>
                      </div>
                    );
                  }

                  // 일반 멤버 UI
                  return (
                    <div
                      key={`${member}-${memberIndex}`}
                      className={`flex items-center gap-2 rounded-[14px] p-2 ${
                        isMe
                          ? "bg-[var(--whisper-cream)]"
                          : "bg-[rgba(244,241,232,0.58)]"
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isMe
                            ? "bg-[var(--ink-black)] text-white"
                            : "bg-white text-[var(--granite)]"
                        }`}
                      >
                        {member.charAt(0)}
                      </div>
                      <span
                        className={`text-xs truncate ${
                          isMe
                            ? "font-medium text-[var(--ink-black)]"
                            : "text-[var(--granite)]"
                        }`}
                      >
                        {member}
                        {isMe && (
                          <span className="ml-1 text-[10px] text-[var(--granite)]">
                            (나)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default LunchGroupList;
