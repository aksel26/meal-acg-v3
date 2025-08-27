"use client";
import { Button } from "@repo/ui/src/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { useMonthlyData } from "@/hooks/useMonthlyData";
import { useEffect } from "react";
import Image from "next/image";

interface AllHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const getDrinkIcon = (drink: string) => {
  if (drink === "선택안함") return "/icons/pending.png";
  if (drink.includes("바닐라") || drink.includes("자몽")) return "/icons/etcDrink.png";
  if (drink.includes("ICE")) return "/icons/ice.png";
  if (drink.includes("HOT")) return "/icons/hot.png";
  return "/icons/pending.png";
};

export const AllHistoryDialog = ({ isOpen, onClose }: AllHistoryDialogProps) => {
  const { data, isLoading, error, fetchData } = useMonthlyData();
  console.log("data:", data);

  useEffect(() => {
    if (isOpen && !data) {
      fetchData();
    }
  }, [isOpen, data, fetchData]);

  const applications = data?.applications || [];
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-md mx-auto p-6 bg-white rounded-lg shadow-lg max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center">전체 신청 내역 조회</DialogTitle>
          <DialogDescription className="text-center text-gray-600">전체 인원 ({applications.length}명)의 음료 신청 내역입니다</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-100 space-y-2 pr-2">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="text-gray-500">데이터를 불러오는 중...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center p-8">
              <div className="text-red-500">오류: {error}</div>
            </div>
          ) : applications.length === 0 ? (
            <div className="flex justify-center items-center p-8">
              <div className="text-gray-500">신청 내역이 없습니다.</div>
            </div>
          ) : (
            applications.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 relative">
                    <Image
                      src={getDrinkIcon(user.drink)}
                      alt={user.drink}
                      width={24}
                      height={24}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    {user.memo && <div className="text-sm text-gray-500">{user.memo}</div>}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-800">{user.drink}</div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
