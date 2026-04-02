"use client";

const ATTENDANCE_TYPES = ["전체", "근무", "휴가", "재택", "외근"] as const;

interface AttendanceFilterProps {
  selected: string;
  onChange: (type: string) => void;
}

export default function AttendanceFilter({
  selected,
  onChange,
}: AttendanceFilterProps) {
  return (
    <div className="flex items-center gap-2">
      {ATTENDANCE_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selected === type
              ? "bg-[oklch(0.55_0.18_250)] text-white"
              : "bg-[oklch(0.96_0.01_250)] text-[oklch(0.45_0.02_250)] hover:bg-[oklch(0.93_0.01_250)]"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
