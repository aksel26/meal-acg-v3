import { ChevronDownIcon } from "@repo/ui/icons";
import { Button } from "@repo/ui/src/button";
import { Calendar } from "@repo/ui/src/calendar";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@repo/ui/src/drawer";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/src/alert-dialog";
import React, { useState } from "react";

interface WelfarePoint {
  id: string;
  date: string;
  type: "activity" | "welfare";
  vendor: string;
  amount: number;
  used: boolean;
  confirmed: boolean;
  notes?: string;
}

interface EditPointDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingPoint: WelfarePoint | null;
  onSave: () => void;
  onDelete?: (point: WelfarePoint) => void;
  onPointChange: (point: WelfarePoint) => void;
  isNewPoint: boolean;
  isDeleting?: boolean;
}

export function EditPointDrawer({ isOpen, onOpenChange, editingPoint, onSave, onDelete, onPointChange, isNewPoint, isDeleting = false }: EditPointDrawerProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  if (!editingPoint) return null;

  const handleSave = () => {
    onSave();
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDelete && editingPoint) {
      onDelete(editingPoint);
    }
  };

  const updatePoint = (updates: Partial<WelfarePoint>) => {
    onPointChange({ ...editingPoint, ...updates });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 빈 문자열이거나 유효한 숫자인 경우에만 업데이트
    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
      updatePoint({ amount: value === "" ? 0 : Number(value) });
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().slice(0, 10);
      updatePoint({ date: formattedDate });
      setDatePickerOpen(false);
    }
  };

  const selectedDate = editingPoint.date ? new Date(editingPoint.date) : undefined;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] max-w-lg mx-auto bg-gradient-to-br from-white to-gray-50">
        <DrawerHeader className="border-b border-gray-100 pb-4 relative">
          <DrawerTitle className="text-md font-semibold text-gray-800">{isNewPoint ? "복지 포인트 내역 추가" : "포인트 수정"}</DrawerTitle>
          <p className="text-xs text-gray-500">{isNewPoint ? "새로운 포인트 내역을 등록하세요" : "기존 포인트 내역을 수정하세요"}</p>
          {!isNewPoint && onDelete && (
            <div className="absolute right-4 bottom-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="text-red-500 border-red-200 bg-red-50 hover:text-red-600 hover:bg-red-100 text-xs px-4 py-1" disabled={isDeleting}>
                    {isDeleting ? <div className="animate-spin rounded-full h-3 w-3 border border-red-500 border-t-transparent"></div> : "내역 삭제"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>내역을 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업은 되돌릴 수 없습니다. <br />
                      선택한 내역이 영구적으로 삭제됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="w-[90%] text-sm mx-auto text-left bg-gray-50 p-3 rounded-md  flex flex-col space-y-2">
                    <strong>삭제할 내역</strong>
                    <div className="flex flex-col items-start space-y-1">
                      <div className="text-gray-400">사용처</div> <div>{editingPoint.vendor}</div>
                    </div>
                    <div className="flex flex-col items-start space-y-1">
                      <div className="text-gray-400">금액</div> <div>{editingPoint.amount.toLocaleString()}원</div>
                    </div>
                    <div className="flex flex-col items-start space-y-1">
                      <div className="text-gray-400">날짜</div> <div>{new Date(editingPoint.date).toLocaleDateString("ko-KR")}</div>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-50 hover:bg-red-700 border border-red-300 text-red-500">
                      내역 삭제하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </DrawerHeader>

        <form className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          {/* 기본 정보 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">기본 정보</h3>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">날짜</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal text-xs border-gray-300 h-[38px] px-3 py-2">
                      {selectedDate ? selectedDate.toLocaleDateString("ko-KR") : "날짜 선택"}
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar mode="single" selected={selectedDate} captionLayout="dropdown" onSelect={handleDateSelect} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-semibold text-gray-700">
                  금액
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    value={editingPoint.amount || ""}
                    onChange={handleAmountChange}
                    className="pr-8 text-sm border-gray-300 h-[38px] py-2"
                    placeholder="금액 입력"
                    min="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 상세 정보 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">상세 정보</h3>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs font-semibold text-gray-700">
                  유형
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updatePoint({ type: "welfare" })}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-all duration-200 text-xs font-medium ${
                      editingPoint.type === "welfare" ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    복지포인트
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePoint({ type: "activity" })}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-all duration-200 text-xs font-medium ${
                      editingPoint.type === "activity" ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    활동비
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor" className="text-xs font-semibold text-gray-700">
                  사용처
                </Label>
                <Input id="vendor" value={editingPoint.vendor} onChange={(e) => updatePoint({ vendor: e.target.value })} className="text-sm border-gray-300" placeholder="사용처를 입력하세요" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-semibold text-gray-700">
                  비고
                </Label>
                <Input
                  id="notes"
                  value={editingPoint.notes || ""}
                  onChange={(e) => updatePoint({ notes: e.target.value })}
                  className="text-sm border-gray-300"
                  placeholder="동반결제자 입력 (OOO위원 결제)"
                />
              </div>
            </div>
          </div>
        </form>

        <DrawerFooter className="px-6 pb-8 pt-4 border-t border-gray-100 bg-white/50 flex gap-x-3">
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1 rounded-lg border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-xs font-medium">
              취소
            </Button>
          </DrawerClose>
          <Button
            onClick={handleSave}
            className={`flex-1 rounded-lg hover:shadow-sm transition-all duration-200 text-xs font-semibold ${
              isNewPoint
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                : "bg-gradient-to-r text-white from-orange-300 to-orange-400 hover:from-orange-100 hover:to-orange-200 hover:text-orange-400"
            } `}
          >
            {isNewPoint ? "추가하기" : "수정하기"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
