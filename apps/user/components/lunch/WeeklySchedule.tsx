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
      <div className="grid grid-cols-2 gap-6">
        {/* 월요일 스켈레톤 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="w-12 h-3 bg-blue-200 rounded animate-pulse mb-2"></div>
          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
        {/* 금요일 스켈레톤 */}
        <div className="bg-green-50 rounded-lg p-3">
          <div className="w-12 h-3 bg-green-200 rounded animate-pulse mb-2"></div>
          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <Popover>
        <PopoverTrigger asChild>
          <div className="bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors">
            <p className="text-xs text-blue-600 font-medium mb-1">월요일</p>
            <p className="text-xs text-gray-500">클릭하여 확인</p>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 border" align="start">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-blue-700 mb-1">월요일 식사조</h4>
            </div>
            <div className="space-y-2">
              {mondayMember ? (
                mondayMember.split("|").map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                    <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                    <p className="text-xs text-gray-700 leading-relaxed">{item.trim()}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">정보가 없습니다</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <div className="bg-green-50 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors">
            <p className="text-xs text-green-600 font-medium mb-1">금요일</p>
            <p className="text-xs text-gray-500">클릭하여 확인</p>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-green-700 mb-1">금요일 식사조</h4>
            </div>
            <div className="p-2 bg-green-50 rounded-md border border-green-200 flex space-x-2 items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
              <p className="text-xs text-gray-700 leading-relaxed">{fridayMember || "정보가 없습니다"}</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default WeeklySchedule;