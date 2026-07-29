const MEMBER_ROLES = new Set(["대표", "본부장", "팀장", "팀원", "인턴"]);

export class InvalidMemberBudgetFieldsError extends Error {}

export function normalizeMemberBudgetFields(
  memberRole: unknown,
  internMonths: unknown,
) {
  if (typeof memberRole !== "string" || !MEMBER_ROLES.has(memberRole)) {
    throw new InvalidMemberBudgetFieldsError("올바른 직군을 선택해주세요.");
  }

  if (memberRole !== "인턴") {
    return { memberRole, internMonths: null };
  }

  const months = Number(internMonths);
  if (!Number.isInteger(months) || months < 1 || months > 6) {
    throw new InvalidMemberBudgetFieldsError(
      "인턴 개월 수는 1~6 사이의 정수여야 합니다.",
    );
  }

  return { memberRole, internMonths: months };
}
