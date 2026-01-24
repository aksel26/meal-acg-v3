"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";

interface WeeklyScheduleProps {
  mondayMember?: string;
  fridayMember?: string;
  isLoading: boolean;
}

const WeeklySchedule = ({ mondayMember, fridayMember, isLoading }: WeeklyScheduleProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {/* 월요일 스켈레톤 */}
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="skeleton w-12 h-3 rounded mb-2" />
          <div className="skeleton w-16 h-3 rounded" />
        </div>
        {/* 금요일 스켈레톤 */}
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="skeleton w-12 h-3 rounded mb-2" />
          <div className="skeleton w-16 h-3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 월요일 */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full bg-gray-50 rounded-xl p-3 text-left hover:bg-gray-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">월요일</p>
                <p className="text-xs font-medium text-gray-700">담당자 확인</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 rounded-xl border border-gray-100 shadow-lg" align="start">
          <div className="p-4 border-b border-gray-100">
            <h4 className="font-medium text-sm text-gray-800">월요일 식사조</h4>
            <p className="text-xs text-gray-500 mt-0.5">이번 주 담당자</p>
          </div>
          <div className="p-3 max-h-48 overflow-y-auto">
            {mondayMember ? (
              <div className="space-y-2">
                {mondayMember.split("|").map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      {item.trim().charAt(0)}
                    </div>
                    <span className="text-xs text-gray-700">{item.trim()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">정보가 없습니다</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* 금요일 */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full bg-gray-50 rounded-xl p-3 text-left hover:bg-gray-100 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">금요일</p>
                <p className="text-xs font-medium text-gray-700">담당자 확인</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 rounded-xl border border-gray-100 shadow-lg" align="start">
          <div className="p-4 border-b border-gray-100">
            <h4 className="font-medium text-sm text-gray-800">금요일 식사조</h4>
            <p className="text-xs text-gray-500 mt-0.5">이번 주 담당자</p>
          </div>
          <div className="p-3">
            {fridayMember ? (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                  {fridayMember.charAt(0)}
                </div>
                <span className="text-xs text-gray-700">{fridayMember}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">정보가 없습니다</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default WeeklySchedule;
