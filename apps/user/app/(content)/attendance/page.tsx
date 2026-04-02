"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useAttendanceMonthly, AttendanceRecord } from "@/hooks/use-attendance-monthly";
import AttendanceMobileView from "@/components/attendance/AttendanceMobileView";
import AttendanceDesktopView from "@/components/attendance/AttendanceDesktopView";
import AttendanceModifyDrawer from "@/components/attendance/AttendanceModifyDrawer";

dayjs.extend(utc);
dayjs.extend(timezone);

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
    now.format("YYYY-MM-DD")
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modifyTarget, setModifyTarget] = useState<AttendanceRecord | null>(null);

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
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원");
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const { data, isLoading } = useAttendanceMonthly(memberId, year, month);
  const records = data?.records ?? [];
  const summary = data?.summary ?? null;

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);
  };

  const handleModifyRequest = (record: AttendanceRecord) => {
    setModifyTarget(record);
    setDrawerOpen(true);
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
      >
        <h1 className="text-xl font-bold text-[oklch(0.20_0.02_250)] mb-5">
          출퇴근 관리
        </h1>

        <div className="md:hidden">
          <AttendanceMobileView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            records={records}
            isLoading={isLoading}
            onModifyRequest={handleModifyRequest}
          />
        </div>

        <div className="max-md:hidden">
          <AttendanceDesktopView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            records={records}
            summary={summary}
            isLoading={isLoading}
            onRowClick={handleModifyRequest}
          />
        </div>
      </motion.div>

      <AttendanceModifyDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        record={modifyTarget}
        memberId={memberId || ""}
      />
    </>
  );
}
