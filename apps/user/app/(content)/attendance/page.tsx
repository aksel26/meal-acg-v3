"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useUserStore } from "@/stores/userStore";
import { useDayoffs, type DayoffRecord } from "@/hooks/use-dayoffs";
import { useLeaveBalances } from "@/hooks/use-leave-balances";
import { useMyModifyRequests } from "@/hooks/use-attendance-modify";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useAttendanceMonthly } from "@/hooks/use-attendance-monthly";
import AttendanceMobileView from "@/components/attendance/AttendanceMobileView";
import AttendanceDesktopView from "@/components/attendance/AttendanceDesktopView";
import DayoffsManager from "@/components/dayoffs/DayoffsManager";

dayjs.extend(utc);
dayjs.extend(timezone);

type DayoffCreateRequest = {
  startDate: string;
  requestId: number;
};
type DayoffEditRequest = { record: DayoffRecord; requestId: number };

export default function AttendancePage() {
  const router = useRouter();
  const userName = useUserStore((s) => s.userName);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const hydrate = useUserStore((s) => s.hydrate);
  const hasHydrated = useUserStore((s) => s.hasHydrated);
  const memberId = useUserStore((s) => s.memberId);
  const setMemberInfo = useUserStore((s) => s.setMemberInfo);

  const [mounted, setMounted] = useState(false);

  const now = dayjs().tz("Asia/Seoul");
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    now.format("YYYY-MM-DD"),
  );
  const [dayoffCreateRequest, setDayoffCreateRequest] =
    useState<DayoffCreateRequest | null>(null);
  const [dayoffEditRequest, setDayoffEditRequest] =
    useState<DayoffEditRequest | null>(null);

  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    setMounted(true);
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!userName && !isLoggedIn) {
      router.push("/");
    }
  }, [router, isLoggedIn, userName, hasHydrated]);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(
        memberLookup.id,
        memberLookup.member_role || "팀원",
        memberLookup.hire_date,
      );
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const { data, isLoading } = useAttendanceMonthly(memberId, year, month);
  const { data: dayoffs } = useDayoffs(year, month, memberId || undefined);
  const { data: leaveBalances } = useLeaveBalances(memberId || null, year);
  const { data: modifyRequests } = useMyModifyRequests(memberId || null);
  const records = data?.records ?? [];
  const summary = data?.summary ?? null;

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);
  };

  const handleCalendarDateSelect = (date: string) => {
    setSelectedDate(date);
    setDayoffEditRequest(null);
    setDayoffCreateRequest((prev) => ({
      startDate: date,
      requestId: (prev?.requestId ?? 0) + 1,
    }));
  };

  const handleManageDayoffs = (
    date: string,
    shouldCreate: boolean,
    record?: DayoffRecord,
  ) => {
    setSelectedDate(date);

    if (shouldCreate) {
      setDayoffEditRequest(null);
      setDayoffCreateRequest((prev) => ({
        startDate: date,
        requestId: (prev?.requestId ?? 0) + 1,
      }));
      return;
    }

    if (record) {
      setDayoffCreateRequest(null);
      setDayoffEditRequest((prev) => ({
        record,
        requestId: (prev?.requestId ?? 0) + 1,
      }));
      return;
    }

    setDayoffCreateRequest(null);
    setDayoffEditRequest(null);
  };

  if (!mounted || !hasHydrated || !userName) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-5 p-4 md:p-6"
      >
        <div className="md:hidden">
          <AttendanceMobileView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate}
            onDateSelect={handleCalendarDateSelect}
            records={records}
            dayoffs={dayoffs || []}
            isLoading={isLoading}
            onManageDayoffs={handleManageDayoffs}
          />
        </div>

        <div className="max-md:hidden">
          <AttendanceDesktopView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate}
            onDateSelect={handleCalendarDateSelect}
            records={records}
            dayoffs={dayoffs || []}
            modifyRequests={modifyRequests || []}
            leaveBalances={leaveBalances || []}
            summary={summary}
            isLoading={isLoading}
            onViewLeaveDetails={() => router.push("/leave")}
            onManageDayoffs={handleManageDayoffs}
          />
        </div>

        <DayoffsManager
          year={year}
          month={month}
          selectedDate={selectedDate}
          createDateRequest={dayoffCreateRequest}
          editRecordRequest={dayoffEditRequest}
          dialogsOnly
          onMonthChange={handleMonthChange}
          onDateSelect={setSelectedDate}
        />
      </motion.div>
    </>
  );
}
