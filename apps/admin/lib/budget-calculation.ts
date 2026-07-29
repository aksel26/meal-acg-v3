export const DEFAULT_ACTIVITY_RATES = {
  leaderRate: 200_000,
  managerRate: 150_000,
  pncExtraRate: 50_000,
} as const;

export interface ActivityBudgetMember {
  id: string;
  full_name: string;
  member_role: string;
  organization_id?: string | null;
  team_id: string | null;
  team_name: string | null;
  intern_months: number | null;
}

export interface ActivityBudgetRates {
  leaderRate: number;
  managerRate: number;
  pncExtraRate: number;
}

export interface ActivityBudgetCalculation {
  memberCount: number;
  amount: number;
  isPnC: boolean;
  pncExtraCount: number;
  basis: string;
  internCount: number;
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

export function calculateActivityBudgets<T extends ActivityBudgetMember>(
  members: T[],
  statusMemberIds: ReadonlySet<string>,
  rates: ActivityBudgetRates = DEFAULT_ACTIVITY_RATES,
): Array<T & ActivityBudgetCalculation> {
  const isRepresentative = (member: ActivityBudgetMember) =>
    member.member_role === "대표" || member.full_name === "정진우";
  const leaderMembers = members.filter(
    (member) =>
      !isRepresentative(member) &&
      (member.member_role === "팀장" || member.member_role === "본부장"),
  );

  if (members.length === 0 || leaderMembers.length === 0) return [];

  const teamCounts = new Map<string, number>();
  members.forEach((member) => {
    if (
      member.team_id &&
      member.member_role !== "인턴" &&
      !isRepresentative(member) &&
      !statusMemberIds.has(member.id)
    ) {
      teamCounts.set(member.team_id, (teamCounts.get(member.team_id) || 0) + 1);
    }
  });

  const teamInterns = new Map<string, T[]>();
  members.forEach((member) => {
    if (
      member.team_id &&
      member.member_role === "인턴" &&
      !statusMemberIds.has(member.id)
    ) {
      const interns = teamInterns.get(member.team_id) || [];
      interns.push(member);
      teamInterns.set(member.team_id, interns);
    }
  });

  const pncTeamByOrganization = new Map<string, string>();
  leaderMembers.forEach((leader) => {
    if (
      leader.team_id &&
      (leader.team_name?.includes("People & Culture") ||
        leader.team_name?.includes("P&C"))
    ) {
      pncTeamByOrganization.set(leader.organization_id || "", leader.team_id);
    }
  });

  return leaderMembers.map((leader) => {
    const memberCount = leader.team_id
      ? teamCounts.get(leader.team_id) || 1
      : 1;
    const pncTeamId = pncTeamByOrganization.get(leader.organization_id || "");
    const isPnC = Boolean(pncTeamId && leader.team_id === pncTeamId);
    const interns = leader.team_id ? teamInterns.get(leader.team_id) || [] : [];
    const pncExtraStaffCount = isPnC
      ? members.filter(
          (member) =>
            member.organization_id === leader.organization_id &&
            member.member_role === "팀원" &&
            member.team_id &&
            member.team_id !== pncTeamId &&
            !statusMemberIds.has(member.id),
        ).length
      : 0;
    const pncExtraInterns = isPnC
      ? members.filter(
          (member) =>
            member.organization_id === leader.organization_id &&
            member.member_role === "인턴" &&
            member.team_id &&
            member.team_id !== pncTeamId &&
            !statusMemberIds.has(member.id),
        )
      : [];
    const pncExtraCount = pncExtraStaffCount + pncExtraInterns.length;

    const internAmount = interns.reduce((sum, intern) => {
      const months = intern.intern_months || 1;
      return sum + Math.round((rates.managerRate / 6) * months);
    }, 0);

    let amount: number;
    let basis: string;
    if (leader.member_role === "본부장") {
      amount = memberCount * rates.leaderRate;
      basis = `${formatCurrency(rates.leaderRate)} × ${memberCount}명`;
    } else if (isPnC) {
      const pncInternAmount = pncExtraInterns.reduce((sum, intern) => {
        const months = intern.intern_months || 1;
        return sum + Math.round((rates.pncExtraRate / 6) * months);
      }, 0);
      amount =
        memberCount * rates.managerRate +
        pncExtraStaffCount * rates.pncExtraRate +
        pncInternAmount;

      const parts = [`본인 ${formatCurrency(rates.managerRate)}`];
      if (memberCount > 1) {
        parts.push(
          `${formatCurrency(rates.managerRate)} × ${memberCount - 1}명`,
        );
      }
      if (pncExtraStaffCount > 0) {
        parts.push(
          `${formatCurrency(rates.pncExtraRate)} × ${pncExtraStaffCount}명 (팀원)`,
        );
      }
      pncExtraInterns.forEach((intern) => {
        const months = intern.intern_months || 1;
        parts.push(
          `인턴 ${intern.full_name} ${formatCurrency(rates.pncExtraRate)}/6×${months}개월`,
        );
      });
      basis = parts.join(" + ");
    } else {
      amount = memberCount * rates.managerRate;
      const parts = [`본인 ${formatCurrency(rates.managerRate)}`];
      if (memberCount > 1) {
        parts.push(
          `${formatCurrency(rates.managerRate)} × ${memberCount - 1}명`,
        );
      }
      basis = parts.join(" + ");
    }

    if (internAmount > 0) {
      amount += internAmount;
      basis +=
        " + " +
        interns
          .map((intern) => {
            const months = intern.intern_months || 1;
            return `인턴 ${intern.full_name} ${formatCurrency(rates.managerRate)}/6×${months}개월`;
          })
          .join(" + ");
    }

    return {
      ...leader,
      memberCount,
      amount,
      isPnC,
      pncExtraCount,
      basis,
      internCount: interns.length,
    };
  });
}
