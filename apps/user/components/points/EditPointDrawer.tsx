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
import React, { useState, useCallback } from "react";
import { PopoverCalendar } from "../PopoverCalendar";
import { ReceiptScanner } from "../ReceiptScanner";
import { ReceiptScanResult } from "@/lib/types/receipt-types";

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

  // 영수증 스캔 완료 핸들러
  const handleScanComplete = useCallback(
    (result: ReceiptScanResult) => {
      if (!editingPoint) return;
      const updates: Partial<WelfarePoint> = {};
      if (result.storeName) {
        updates.vendor = result.storeName;
      }
      if (result.totalAmount > 0) {
        updates.amount = result.totalAmount;
      }
      if (result.date) {
        updates.date = result.date;
      }
      if (Object.keys(updates).length > 0) {
        onPointChange({ ...editingPoint, ...updates });
      }
    },
    [editingPoint, onPointChange]
  );

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
      // 시간대 문제를 해결하기 위해 로컬 날짜로 변환
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      updatePoint({ date: formattedDate });
      setDatePickerOpen(false);
    }
  };

  const selectedDate = editingPoint.date ? new Date(editingPoint.date) : undefined;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] max-w-lg mx-auto bg-gradient-to-br from-white to-[var(--soft-bone)]">
        <DrawerHeader className="border-b border-[rgba(14,15,12,0.06)] pb-4 relative">
          <DrawerTitle className="text-md font-medium text-[var(--ink-black)]">{isNewPoint ? "복지 포인트 내역 추가" : "포인트 수정"}</DrawerTitle>
          <p className="text-xs text-[var(--granite)]">{isNewPoint ? "새로운 포인트 내역을 등록하세요" : "기존 포인트 내역을 수정하세요"}</p>
          {!isNewPoint && onDelete && (
            <div className="absolute right-4 bottom-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="text-[#d03238] border-[rgba(208,50,56,0.2)] bg-[rgba(208,50,56,0.08)] hover:text-[#d03238] hover:bg-[rgba(208,50,56,0.12)] text-xs px-4 py-1" disabled={isDeleting}>
                    {isDeleting ? <div className="animate-spin rounded-full h-3 w-3 border border-[#d03238] border-t-transparent"></div> : "내역 삭제"}
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
                  <div className="w-[90%] text-sm mx-auto text-left bg-[var(--soft-bone)] p-3 rounded-md  flex flex-col space-y-2">
                    <strong>삭제할 내역</strong>
                    <div className="flex flex-col items-start space-y-1">
                      <div className="text-[var(--slate-gray)]">사용처</div> <div>{editingPoint.vendor}</div>
                    </div>
                    <div className="flex flex-col items-start space-y-1">
                      <div className="text-[var(--slate-gray)]">금액</div> <div>{editingPoint.amount.toLocaleString()}원</div>
                    </div>
                    <div className="flex flex-col items-start space-y-1">
                      <div className="text-[var(--slate-gray)]">날짜</div> <div>{new Date(editingPoint.date).toLocaleDateString("ko-KR")}</div>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-[rgba(208,50,56,0.08)] hover:bg-[#a8181e] border border-[rgba(208,50,56,0.3)] text-[#d03238]">
                      내역 삭제하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </DrawerHeader>

        <form className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          {/* 영수증 스캔 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--granite)]">영수증 스캔</h3>
              <div className="h-px flex-1 bg-[var(--soft-bone)]"></div>
            </div>
            <ReceiptScanner onScanComplete={handleScanComplete} />
          </div>

          {/* 기본 정보 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--granite)]">기본 정보</h3>
              <div className="h-px flex-1 bg-[var(--soft-bone)]"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[var(--granite)]">날짜</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal text-xs border-[rgba(14,15,12,0.12)] h-[38px] px-3 py-2">
                      {selectedDate ? `${selectedDate.getFullYear()}.${String(selectedDate.getMonth() + 1).padStart(2, "0")}.${String(selectedDate.getDate()).padStart(2, "0")}` : "날짜 선택"}
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      captionLayout="dropdown"
                      onSelect={handleDateSelect}
                      showOutsideDays={false}
                      classNames={{
                        day_selected: "bg-[rgba(56,200,255,0.12)]0! text-white! hover:bg-[var(--ink-black)] focus:bg-[var(--ink-black)]",
                        day_today: "bg-orange-100 text-orange-900 font-semibold",
                        today: "border border-[var(--granite)] rounded-lg",
                      }}
                      components={{
                        YearsDropdown: ({ value }) => {
                          return <div className="p-2 text-sm sm:text-md">{value ?? new Date().getFullYear()}</div>;
                        },
                        MonthsDropdown: ({ value }) => {
                          return <div className="p-2 text-sm sm:text-md">{Number(value ?? new Date().getMonth()) + 1}월</div>;
                        },
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-semibold text-[var(--granite)]">
                  금액
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    value={editingPoint.amount || ""}
                    onChange={handleAmountChange}
                    className="pr-8 text-sm border-[rgba(14,15,12,0.12)] h-[38px] py-2"
                    placeholder="금액 입력"
                    min="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--granite)]">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 상세 정보 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--granite)]">상세 정보</h3>
              <div className="h-px flex-1 bg-[var(--soft-bone)]"></div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs font-semibold text-[var(--granite)]">
                  유형
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updatePoint({ type: "welfare" })}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-all duration-200 text-xs font-medium ${
                      editingPoint.type === "welfare" ? "bg-[rgba(56,200,255,0.12)] border-[rgba(14,15,12,0.12)] text-[var(--ink-black)]" : "bg-white border-[rgba(14,15,12,0.08)] text-[var(--granite)] hover:bg-[var(--soft-bone)]"
                    }`}
                  >
                    복지포인트
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePoint({ type: "activity" })}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-all duration-200 text-xs font-medium ${
                      editingPoint.type === "activity" ? "bg-orange-50 border-orange-200 text-orange-800" : "bg-white border-[rgba(14,15,12,0.08)] text-[var(--granite)] hover:bg-[var(--soft-bone)]"
                    }`}
                  >
                    활동비
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor" className="text-xs font-semibold text-[var(--granite)]">
                  사용처
                </Label>
                <Input id="vendor" value={editingPoint.vendor} onChange={(e) => updatePoint({ vendor: e.target.value })} className="text-sm border-[rgba(14,15,12,0.12)]" placeholder="사용처를 입력하세요" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-semibold text-[var(--granite)]">
                  비고
                </Label>
                <Input
                  id="notes"
                  value={editingPoint.notes || ""}
                  onChange={(e) => updatePoint({ notes: e.target.value })}
                  className="text-sm border-[rgba(14,15,12,0.12)]"
                  placeholder="동반결제자 입력 (OOO위원 결제)"
                />
              </div>
            </div>
          </div>
        </form>

        <DrawerFooter className="px-6 pb-8 pt-4 border-t border-[rgba(14,15,12,0.06)] bg-white/50 flex gap-x-3">
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1 rounded-lg border-[rgba(14,15,12,0.12)] hover:bg-[var(--soft-bone)] hover:border-[var(--slate-gray)] transition-all duration-200 text-xs font-medium">
              취소
            </Button>
          </DrawerClose>
          <Button
            onClick={handleSave}
            className={`flex-1 rounded-lg hover:shadow-sm transition-all duration-200 text-xs font-semibold ${
              isNewPoint
                ? "bg-gradient-to-r from-[var(--ink-black)] to-[var(--granite)] hover:from-[var(--ink-black)] hover:to-[#0e0f0c] text-white"
                : "bg-[var(--ink-black)] hover:bg-[var(--granite)] text-white"
            } `}
          >
            {isNewPoint ? "추가하기" : "수정하기"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
