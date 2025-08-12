"use client";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/src/card";
import { Badge } from "@repo/ui/src/badge";
import React, { useState, useEffect } from "react";
import { Button } from "@repo/ui/src/button";

// 더미 데이터 - 10조 편성
const teamData = [
  {
    id: 1,
    name: "1조",
    members: ["김철수", "이영희", "박민수", "정수현", "최동욱"],
  },
  {
    id: 2,
    name: "2조",
    members: ["한지민", "서준호", "윤상철", "강미영"],
  },
  {
    id: 3,
    name: "3조",
    members: ["이도현", "김성민", "김현민", "최유진", "임준혁"],
  },
  {
    id: 4,
    name: "4조",
    members: ["조현우", "신예림", "백승훈", "안소영"],
  },
  {
    id: 5,
    name: "5조",
    members: ["홍길동", "김미나", "이준석", "박소희", "정태영"],
  },
  {
    id: 6,
    name: "6조",
    members: ["류현진", "송혜교", "전지현", "이병헌"],
  },
  {
    id: 7,
    name: "7조",
    members: ["김태희", "현빈", "손예진", "이민호", "박서준"],
  },
  {
    id: 8,
    name: "8조",
    members: ["아이유", "박보검", "김수현", "전지현"],
  },
  {
    id: 9,
    name: "9조",
    members: ["김고은", "공유", "이동욱", "유인나", "임시완"],
  },
  {
    id: 10,
    name: "10조",
    members: ["한소희", "송중기", "김지원", "박혜수"],
  },
];

const Lunch = () => {
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const name = localStorage.getItem("name");
    if (name) {
      setUserName(name);
    }
  }, []);

  const isMyTeam = (members: string[]) => {
    return userName && members.includes(userName);
  };

  return (
    <React.Fragment>
      <div className="pb-14">
        {/* 헤더 */}
        <Card className="bg-white border-none shadow-none mb-4">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-800">점심조 편성</CardTitle>
            <CardDescription>
              <span className="text-sm text-gray-500">총 10개 조 • {teamData.reduce((acc, team) => acc + team.members.length, 0)}명</span>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex space-x-6">
              <div className="">
                <p className="text-xs text-gray-500">시작일</p>
                <p className="text-sm font-medium text-gray-800">2025.01.06</p>
              </div>
              <div className="">
                <p className="text-xs text-gray-500">다음 뽑기</p>
                <p className="text-sm font-medium text-gray-800">2025.01.13</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button className="fixed bottom-24 w-[calc(100%-32px)] text-green-800 mx-auto  mb-4 py-6 bg-gradient-to-r from-teal-200 to-lime-200">점심조 뽑기</Button>
        {/* 조 편성 목록 */}
        <div className="space-y-4">
          {teamData.map((team) => {
            const isMyTeamHighlight = isMyTeam(team.members);

            return (
              <Card key={team.id} className={`transition-all duration-200 hover:shadow-md ${isMyTeamHighlight ? "bg-blue-50 border border-blue-300 shadow-none" : "bg-white border-none shadow-none"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={`px-3 py-1 ${isMyTeamHighlight ? "bg-blue-600 text-white" : "bg-gray-800 text-white"}`}>{team.name}</Badge>
                      <span className={`text-sm ${isMyTeamHighlight ? "text-blue-600 font-medium" : "text-gray-500"}`}>{team.members.length}명</span>
                      {isMyTeamHighlight && <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5">내 조</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {team.members.map((member, index) => {
                      const isMe = userName && member === userName;

                      return (
                        <div
                          key={index}
                          className={`flex items-center space-x-2 rounded-lg p-2 text-sm ${isMe ? "bg-blue-100 border border-blue-200" : isMyTeamHighlight ? "bg-blue-25 bg-white/70" : "bg-gray-50"}`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              isMe ? "bg-blue-500 text-white" : isMyTeamHighlight ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {member.charAt(0)}
                          </div>
                          <span className={`font-medium ${isMe ? "text-blue-700 font-semibold" : isMyTeamHighlight ? "text-blue-700" : "text-gray-700"}`}>
                            {member}
                            {isMe && <span className="ml-1 text-xs text-blue-600">(나)</span>}
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

        <BottomNavigation />
      </div>
    </React.Fragment>
  );
};

export default Lunch;
