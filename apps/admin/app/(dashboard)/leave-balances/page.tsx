"use client";

import { LeaveBalancesPanel } from "@/components/dayoffs/LeaveBalancesPanel";

export default function LeaveBalancesPage() {
  return <LeaveBalancesPanel year={new Date().getFullYear()} />;
}
