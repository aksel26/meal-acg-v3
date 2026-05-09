export const REQUEST_TYPES = [
  { id: "bug", name: "버그", defaultTeamName: "HR TECH팀", defaultPriority: "P1" },
  { id: "data", name: "데이터 요청", defaultTeamName: "HR 운영팀", defaultPriority: "P2" },
  { id: "setup", name: "세팅", defaultTeamName: "HR TECH팀", defaultPriority: "P2" },
  { id: "print", name: "출력", defaultTeamName: "HR 운영팀", defaultPriority: "P2" },
  { id: "etc", name: "기타", defaultTeamName: "", defaultPriority: "P3" },
] as const;

export type RequestTypeId = (typeof REQUEST_TYPES)[number]["id"];

export function getRequestType(id: string | null | undefined) {
  return REQUEST_TYPES.find((type) => type.id === id) ?? null;
}
