"use client";

import { useState, useMemo } from "react";
import { useRoomAssignments } from "@/hooks/use-room-assignments";
import { useAssignmentsByJobPosting } from "@/hooks/use-assignments";
import { useJobPostings } from "@/hooks/use-job-postings";
import RoomTimetable from "@/components/room-assignments/RoomTimetable";
import RoomAssignmentSidebar from "@/components/room-assignments/RoomAssignmentSidebar";
import WorkerSidePanel from "@/components/room-assignments/WorkerSidePanel";
import dayjs from "dayjs";

export default function RoomAssignmentsPage() {
  const today = dayjs().format("YYYY-MM-DD");
  const [date, setDate] = useState(today);
  const [selectedJobPostingId, setSelectedJobPostingId] = useState<
    string | null
  >(null);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);

  const { data: jobPostingsData } = useJobPostings();
  const jobPostings = useMemo(
    () =>
      (jobPostingsData || []).filter(
        (jp) => jp.status === "open" || jp.status === "in_progress"
      ),
    [jobPostingsData]
  );

  const handleJobPostingChange = (id: string | null) => {
    setSelectedJobPostingId(id);
    if (id) {
      const jp = jobPostings.find((j) => j.id === id);
      if (jp?.work_start && jp?.work_end) {
        setStartHour(parseInt(jp.work_start.split(":")[0] ?? "9", 10));
        setEndHour(parseInt(jp.work_end.split(":")[0] ?? "18", 10));
      }
    }
  };

  const { data: roomData } = useRoomAssignments(date);
  const roomAssignments = roomData?.room_assignments || [];

  const { data: assignments } =
    useAssignmentsByJobPosting(selectedJobPostingId);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">회의실 배정</h3>

      <div className="flex gap-4">
        <RoomAssignmentSidebar
          date={date}
          onDateChange={setDate}
          jobPostings={jobPostings}
          selectedJobPostingId={selectedJobPostingId}
          onJobPostingChange={handleJobPostingChange}
          startHour={startHour}
          endHour={endHour}
          onStartHourChange={setStartHour}
          onEndHourChange={setEndHour}
        />

        <div className="flex flex-1 gap-4 overflow-hidden">
          <RoomTimetable
            date={date}
            startHour={startHour}
            endHour={endHour}
            roomAssignments={roomAssignments}
            availableAssignments={assignments || []}
          />

          <WorkerSidePanel
            assignments={assignments || []}
            roomAssignments={roomAssignments}
          />
        </div>
      </div>
    </div>
  );
}
