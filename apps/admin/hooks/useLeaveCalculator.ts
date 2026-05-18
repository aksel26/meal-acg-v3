import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface LeaveCalculatorRuleSummary {
  monthly: string;
  annual: string;
  summer: string;
  deduction: string;
  balance: string;
  conversion: string;
  carryover: string;
}

export interface LeaveCalculationItem {
  type: "monthly" | "annual" | "summer" | "carryover";
  label: string;
  calculated: number | null;
  applied: number;
  used: number;
  remaining: number;
  basis: string;
  status: "calculated" | "unavailable" | "not_applicable";
}

export interface LeaveCalculationMember {
  memberId: string;
  fullName: string;
  teamName: string | null;
  positionName: string | null;
  memberRole: string | null;
  hireDate: string | null;
  internMonths: number | null;
  yearsEmployed: number | null;
  monthsEmployed: number | null;
  conversionDate: string | null;
  status: "ok" | "needs_data" | "not_applicable";
  statusLabel: string;
  totalCalculated: number;
  totalApplied: number;
  items: LeaveCalculationItem[];
  notes: string[];
}

export interface LeaveCalculatorPreview {
  year: number;
  generatedAt: string;
  rules: LeaveCalculatorRuleSummary;
  summary: {
    totalMembers: number;
    calculableMembers: number;
    needsDataMembers: number;
    notApplicableMembers: number;
    totalCalculated: number;
    totalApplied: number;
  };
  members: LeaveCalculationMember[];
}

export function useLeaveCalculatorPreview(year: number) {
  return useQuery<LeaveCalculatorPreview>({
    queryKey: queryKeys.leaveCalculator.byYear(year),
    queryFn: async () => {
      const res = await fetch(`/api/leave-calculator?year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch leave calculator preview");
      return res.json();
    },
  });
}
