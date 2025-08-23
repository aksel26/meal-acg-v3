"use client";
import React, { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@repo/ui/src/card";
import { Badge } from "@repo/ui/src/badge";
import { LunchGroup } from "@/hooks/useLunchGroup";

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
  data: string[]
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
  groupNumber: string
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
            member.trim().toLowerCase() === userName.trim().toLowerCase()
        )
      );
    },
    [userName]
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
      <Card className="bg-white border-none shadow-none">
        <CardContent className="text-center py-8">
          <p className="text-gray-500 mb-2">등록된 점심조가 없습니다.</p>
          <p className="text-sm text-gray-400">관리자에게 문의해주세요.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedTeams.map((team) => {
        const isMyTeamHighlight = isMyTeam(team.members);

        return (
          <Card
            key={`${team.rawGroupNumber}-${team.id}`}
            className={`transition-all duration-200 hover:shadow-md ${
              isMyTeamHighlight
                ? "bg-blue-50 border border-blue-300 shadow-none"
                : "bg-white border-none shadow-none"
            } ${onTeamClick ? "cursor-pointer" : ""}`}
            onClick={() =>
              onTeamClick?.(
                team.rawGroupNumber,
                team.members.map((m) => m.member)
              )
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge
                    className={`px-3 py-1 ${isMyTeamHighlight ? "bg-blue-600 text-white" : "bg-gray-800 text-white"}`}
                  >
                    {team.name}
                  </Badge>
                  <span
                    className={`text-sm ${isMyTeamHighlight ? "text-blue-600 font-medium" : "text-gray-500"}`}
                  >
                    {team.members.filter((m) => !m.isEmpty).length}/
                    {team.members.length}명
                  </span>
                  {isMyTeamHighlight && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
                      내 조
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2">
                {team.members.map(({ member, isEmpty }, index) => {
                  const isMe =
                    userName &&
                    !isEmpty &&
                    member.trim().toLowerCase() ===
                      userName.trim().toLowerCase();

                  if (isEmpty) {
                    // 빈 슬롯 UI
                    return (
                      <div
                        key={`empty-${index}`}
                        className={`flex items-center space-x-2 rounded-lg p-2 text-xs sm:text-sm border border-dashed ${isMyTeamHighlight ? "border-blue-200 bg-blue-25" : "border-gray-300 bg-gray-25"}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border border-dashed flex items-center justify-center text-xs font-medium ${
                            isMyTeamHighlight
                              ? "border-blue-300 text-blue-400"
                              : "border-gray-400 text-gray-400"
                          }`}
                        >
                          ?
                        </div>
                        <span
                          className={`font-medium text-xs italic ${isMyTeamHighlight ? "text-blue-400" : "text-gray-400"}`}
                        >
                          빈 자리
                        </span>
                      </div>
                    );
                  }

                  // 일반 멤버 UI
                  return (
                    <div
                      key={`${member}-${index}`}
                      className={`flex items-center space-x-2 rounded-lg p-2  text-xs sm:text-sm ${isMe ? "bg-blue-100 border border-blue-200" : isMyTeamHighlight ? "bg-white/70" : "bg-gray-50"}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isMe
                            ? "bg-blue-500 text-white"
                            : isMyTeamHighlight
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {member.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`font-medium ${isMe ? "text-blue-700 font-semibold" : isMyTeamHighlight ? "text-blue-700" : "text-gray-700"}`}
                      >
                        {member}
                        {isMe && (
                          <span className="ml-1 text-xs text-blue-600">
                            (나)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default LunchGroupList;
