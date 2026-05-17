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
    <div className="flex flex-wrap items-center gap-1.5">
      {ATTENDANCE_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            selected === type
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-[#f3f3f3] bg-white text-slate-500 hover:border-slate-300 hover:bg-[#f9f9fa]"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
