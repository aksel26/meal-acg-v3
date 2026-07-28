"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import dayjs from "dayjs";
import { Check, Pencil, Plus, Search, Trash2, Undo2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/src/alert-dialog";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/src/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { Textarea } from "@repo/ui/src/textarea";
import { toast } from "sonner";
import { useLibrary, useLibraryMutations } from "@/hooks/useLibrary";
import type {
  BookRentalStatus,
  BookStatus,
  LibraryAdminOverview,
  LibraryBook,
  LibraryRental,
} from "@/lib/library-types";
import {
  BOOK_AVAILABILITY_LABEL,
  BOOK_RENTAL_STATUS_LABEL,
  BOOK_STATUS_LABEL,
  getBookAvailability,
  getJoinedItem,
  getRentalDayState,
  getTeamName,
} from "@/lib/library-types";

type BookForm = {
  title: string;
  author: string;
  memo: string;
  status: BookStatus;
  rentalPeriodDaysOverride: string;
};

const RENTAL_STATUS_FILTERS: Array<BookRentalStatus | "all"> = [
  "all",
  "pending",
  "approved",
  "return_requested",
  "rejected",
  "returned",
];

const RENTAL_STATUS_FILTER_LABEL: Record<BookRentalStatus | "all", string> = {
  all: "전체",
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  return_requested: "P&C 접수중",
  returned: "반납완료",
};

const BUTTON_MOTION_CLASS =
  "transition-[background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none";

export function AdminLibraryClient({
  initialData,
}: {
  initialData: LibraryAdminOverview;
}) {
  const libraryQuery = useLibrary(initialData);
  const mutations = useLibraryMutations();
  const data = libraryQuery.data ?? initialData;
  const [keyword, setKeyword] = useState("");
  const [rentalStatusFilter, setRentalStatusFilter] = useState<
    BookRentalStatus | "all"
  >("all");
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [bookForm, setBookForm] = useState<BookForm>(createEmptyBookForm);
  const [settingsValue, setSettingsValue] = useState(
    String(initialData.settings.default_rental_period_days),
  );
  const [deleteTarget, setDeleteTarget] = useState<LibraryBook | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LibraryRental | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setSettingsValue(String(data.settings.default_rental_period_days));
  }, [data.settings.default_rental_period_days]);

  const isSubmitting = Object.values(mutations).some(
    (mutation) => mutation.isPending,
  );

  const bookRows = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return data.books.filter((book) => {
      if (!normalized) return true;
      return [book.title, book.author, book.memo]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [data.books, keyword]);

  const rentalRows = useMemo(() => {
    return data.rentals.filter((rental) => {
      if (
        rentalStatusFilter !== "all" &&
        rental.status !== rentalStatusFilter
      ) {
        return false;
      }
      const normalized = keyword.trim().toLowerCase();
      if (!normalized) return true;
      const requester = getJoinedItem(rental.requester);
      const book = getJoinedItem(rental.book);
      return [
        requester?.full_name,
        getTeamName(requester?.team),
        book?.title,
        book?.author,
        rental.reject_reason,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [data.rentals, keyword, rentalStatusFilter]);

  const rentableCount = data.books.filter(
    (book) => getBookAvailability(book, data.rentals) === "rentable",
  ).length;
  const rentedCount = data.books.filter(
    (book) => getBookAvailability(book, data.rentals) === "rented",
  ).length;
  const pendingCount = data.rentals.filter(
    (rental) => rental.status === "pending",
  ).length;

  function openCreateBook() {
    setEditingBook(null);
    setBookForm(createEmptyBookForm());
    setBookDialogOpen(true);
  }

  function openEditBook(book: LibraryBook) {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author ?? "",
      memo: book.memo ?? "",
      status: book.status,
      rentalPeriodDaysOverride:
        book.rental_period_days_override === null
          ? ""
          : String(book.rental_period_days_override),
    });
    setBookDialogOpen(true);
  }

  async function submitBook() {
    try {
      const payload = {
        title: bookForm.title,
        author: bookForm.author,
        memo: bookForm.memo,
        status: bookForm.status,
        rentalPeriodDaysOverride: bookForm.rentalPeriodDaysOverride,
      };
      if (editingBook) {
        await mutations.updateBook.mutateAsync({ id: editingBook.id, payload });
        toast.success("도서 정보를 수정했습니다.");
      } else {
        await mutations.createBook.mutateAsync(payload);
        toast.success("도서를 추가했습니다.");
      }
      setBookDialogOpen(false);
      setEditingBook(null);
      setBookForm(createEmptyBookForm());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "도서 저장 실패");
    }
  }

  async function deleteBook() {
    if (!deleteTarget) return;
    const book = deleteTarget;
    try {
      await mutations.deleteBook.mutateAsync(book.id);
      toast.success("도서를 삭제했습니다.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "도서 삭제 실패");
    }
  }

  async function saveSettings() {
    const value = Number(settingsValue);
    if (!Number.isInteger(value) || value <= 0) {
      toast.warning("기본 대여 기간은 1일 이상이어야 합니다.");
      return;
    }
    try {
      await mutations.saveSettings.mutateAsync(value);
      toast.success("기본 대여 기간을 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "설정 저장 실패");
    }
  }

  async function approveRental(rental: LibraryRental) {
    try {
      await mutations.decideRental.mutateAsync({
        id: rental.id,
        status: "approved",
      });
      toast.success("대여 신청을 승인했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "승인 처리 실패");
    }
  }

  async function submitRejectRental() {
    if (!rejectTarget) return;
    try {
      await mutations.decideRental.mutateAsync({
        id: rejectTarget.id,
        status: "rejected",
        rejectReason,
      });
      toast.success("대여 신청을 반려했습니다.");
      setRejectTarget(null);
      setRejectReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "반려 처리 실패");
    }
  }

  async function confirmReturn(rental: LibraryRental) {
    try {
      await mutations.confirmReturn.mutateAsync(rental.id);
      toast.success("반납을 완료 처리했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "반납 처리 실패");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-sm text-[#7a7a7a] tabular-nums">
          대여 가능 {rentableCount}권 · 대여중 {rentedCount}권 · 승인대기{" "}
          {pendingCount}건
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Card className="border-0 bg-white shadow-none">
            <CardContent className="flex items-center gap-2 p-3">
              <Label
                htmlFor="defaultRentalPeriod"
                className="whitespace-nowrap text-sm font-medium text-[#6e6e73]"
              >
                기본 대여 기간
              </Label>
              <Input
                id="defaultRentalPeriod"
                value={settingsValue}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSettingsValue(event.target.value)
                }
                className="h-[40px] w-20 rounded-[6px] tabular-nums"
                inputMode="numeric"
              />
              <span className="text-sm text-[#6e6e73]">일</span>
              <Button
                variant="secondary"
                disabled={isSubmitting}
                onClick={saveSettings}
                className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
              >
                저장
              </Button>
            </CardContent>
          </Card>
          <Button
            onClick={openCreateBook}
            disabled={isSubmitting}
            className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
          >
            <Plus aria-hidden="true" strokeWidth={1.5} />
            도서 추가
          </Button>
        </div>
      </div>

      <Card className="border-0 bg-white shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              aria-hidden="true"
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#86868b]"
            />
            <Input
              value={keyword}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setKeyword(event.target.value)
              }
              aria-label="도서명, 저자, 신청자 검색"
              placeholder="도서명, 저자, 신청자 검색"
              className="h-[40px] rounded-[6px] pl-9"
            />
          </div>
          <Select
            value={rentalStatusFilter}
            onValueChange={(value) =>
              setRentalStatusFilter(value as BookRentalStatus | "all")
            }
          >
            <SelectTrigger
              aria-label="대여 상태 필터"
              className="h-[40px] w-full rounded-[6px] sm:w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-0 shadow-none ring-0">
              {RENTAL_STATUS_FILTERS.map((status) => (
                <SelectItem key={status} value={status}>
                  {RENTAL_STATUS_FILTER_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 bg-white shadow-none">
        <CardHeader className="p-5 pb-4">
          <CardTitle className="text-base font-semibold text-[#1d1d1f]">
            도서 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[980px] text-left text-sm">
            <TableHeader className="text-left text-xs font-medium text-slate-400">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="h-9 px-5 py-2 font-medium">
                  도서
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  대여 가능여부
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  대여중 인원
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  대여 기간
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  메모
                </TableHead>
                <TableHead className="h-9 px-5 py-2 text-right font-medium">
                  관리
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookRows.map((book) => {
                const availability = getBookAvailability(book, data.rentals);
                const activeRental = data.rentals.find(
                  (rental) =>
                    rental.book_id === book.id &&
                    ["approved", "return_requested"].includes(rental.status) &&
                    rental.returned_at === null,
                );
                const requester = getJoinedItem(activeRental?.requester);
                return (
                  <TableRow
                    key={book.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <TableCell className="px-5 py-3">
                      <div className="font-medium text-slate-800">
                        {book.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {book.author || "저자 미입력"}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <StatusBadge
                        label={BOOK_AVAILABILITY_LABEL[availability]}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      {requester ? (
                        <div>
                          <div className="font-medium text-slate-800">
                            {requester.full_name || "-"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {getTeamName(requester.team) || "-"} ·{" "}
                            {activeRental
                              ? BOOK_RENTAL_STATUS_LABEL[activeRental.status]
                              : "-"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-slate-600 tabular-nums">
                      {book.rental_period_days_override
                        ? `${book.rental_period_days_override}일`
                        : `기본 ${data.settings.default_rental_period_days}일`}
                    </TableCell>
                    <TableCell className="max-w-[240px] px-5 py-3 text-slate-600">
                      {book.memo || "-"}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditBook(book)}
                          aria-label={`${book.title} 수정`}
                          className={`size-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
                        >
                          <Pencil aria-hidden="true" strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(book)}
                          disabled={isSubmitting}
                          aria-label={`${book.title} 삭제`}
                          className={`size-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
                        >
                          <Trash2 aria-hidden="true" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!bookRows.length && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    등록된 도서가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 bg-white shadow-none">
        <CardHeader className="p-5 pb-4">
          <CardTitle className="text-base font-semibold text-[#1d1d1f]">
            대여 신청 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[1120px] text-left text-sm">
            <TableHeader className="text-left text-xs font-medium text-slate-400">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="h-9 px-5 py-2 font-medium">
                  도서
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  신청자
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  상태
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  신청/승인일
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  대여/반납일
                </TableHead>
                <TableHead className="h-9 px-5 py-2 font-medium">
                  잔여/초과
                </TableHead>
                <TableHead className="h-9 px-5 py-2 text-right font-medium">
                  처리
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentalRows.map((rental) => {
                const book = getJoinedItem(rental.book);
                const requester = getJoinedItem(rental.requester);
                const processor = getJoinedItem(rental.processor);
                const dayState = getRentalDayState(
                  rental.due_at,
                  rental.returned_at,
                );
                return (
                  <TableRow
                    key={rental.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <TableCell className="px-5 py-3">
                      <div className="font-medium text-slate-800">
                        {book?.title || "-"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {book?.author || "저자 미입력"}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="font-medium text-slate-800">
                        {requester?.full_name || "-"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {getTeamName(requester?.team) || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <StatusBadge
                        label={BOOK_RENTAL_STATUS_LABEL[rental.status]}
                        status={rental.status}
                      />
                      {rental.reject_reason && (
                        <div className="mt-1 max-w-[220px] text-xs text-slate-400">
                          {rental.reject_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-slate-600">
                      <DateLine label="신청" value={rental.requested_at} />
                      <DateLine label="승인" value={rental.approved_at} />
                      {processor && (
                        <div className="text-xs">
                          처리자 {processor.full_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-slate-600">
                      <DateLine label="대여" value={rental.rented_at} />
                      <DateLine label="반납" value={rental.returned_at} />
                      <DateLine
                        label="반납요청"
                        value={rental.return_requested_at}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-3 tabular-nums">
                      {dayState.remainingDays !== null && (
                        <span className="font-medium text-slate-600">
                          {dayState.remainingDays}일 남음
                        </span>
                      )}
                      {dayState.overdueDays !== null && (
                        <span className="font-medium text-slate-600">
                          {dayState.overdueDays}일 초과
                        </span>
                      )}
                      {dayState.remainingDays === null &&
                        dayState.overdueDays === null && (
                          <span className="text-slate-400">-</span>
                        )}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {rental.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveRental(rental)}
                              disabled={isSubmitting}
                              className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
                            >
                              <Check aria-hidden="true" strokeWidth={1.5} />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setRejectTarget(rental)}
                              disabled={isSubmitting}
                              className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
                            >
                              <X aria-hidden="true" strokeWidth={1.5} />
                              반려
                            </Button>
                          </>
                        )}
                        {rental.status === "return_requested" && (
                          <Button
                            size="sm"
                            onClick={() => confirmReturn(rental)}
                            disabled={isSubmitting}
                            className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
                          >
                            <Undo2 aria-hidden="true" strokeWidth={1.5} />
                            반납완료
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rentalRows.length && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    대여 신청 내역이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-xl gap-0 border-0 bg-white p-0 shadow-none">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-base font-semibold">
              {editingBook ? "도서 정보 수정" : "도서 추가"}
            </DialogTitle>
            <DialogDescription>
              도서 정보와 대여 정책을 입력해 주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6">
            <Field id="bookTitle" label="도서명">
              <Input
                id="bookTitle"
                value={bookForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBookForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                className="h-[40px] rounded-[6px]"
              />
            </Field>
            <Field id="bookAuthor" label="저자">
              <Input
                id="bookAuthor"
                value={bookForm.author}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBookForm((prev) => ({
                    ...prev,
                    author: event.target.value,
                  }))
                }
                className="h-[40px] rounded-[6px]"
              />
            </Field>
            <Field id="bookStatus" label="상태">
              <Select
                value={bookForm.status}
                onValueChange={(value) =>
                  setBookForm((prev) => ({
                    ...prev,
                    status: value as BookStatus,
                  }))
                }
              >
                <SelectTrigger
                  id="bookStatus"
                  className="h-[40px] w-full rounded-[6px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-0 shadow-none ring-0">
                  {Object.entries(BOOK_STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="bookRentalPeriod" label="개별 대여 기간">
              <Input
                id="bookRentalPeriod"
                value={bookForm.rentalPeriodDaysOverride}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBookForm((prev) => ({
                    ...prev,
                    rentalPeriodDaysOverride: event.target.value,
                  }))
                }
                placeholder={`비우면 기본 ${data.settings.default_rental_period_days}일`}
                inputMode="numeric"
                className="h-[40px] rounded-[6px] tabular-nums"
              />
            </Field>
            <Field id="bookMemo" label="메모">
              <Textarea
                id="bookMemo"
                value={bookForm.memo}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setBookForm((prev) => ({ ...prev, memo: event.target.value }))
                }
                className="min-h-24 rounded-[6px]"
              />
            </Field>
          </div>
          <DialogFooter className="p-6 pt-5">
            <Button
              variant="secondary"
              onClick={() => setBookDialogOpen(false)}
              className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
            >
              취소
            </Button>
            <Button
              onClick={submitBook}
              disabled={isSubmitting}
              className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="max-w-md gap-0 border-0 bg-white p-0 shadow-none">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-base font-semibold">
              대여 신청 반려
            </DialogTitle>
            <DialogDescription>
              신청자가 확인할 수 있도록 반려 사유를 입력해 주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <Label htmlFor="rejectReason" className="sr-only">
              반려 사유
            </Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setRejectReason(event.target.value)
              }
              placeholder="반려 사유"
              className="min-h-28 rounded-[6px]"
            />
          </div>
          <DialogFooter className="p-6 pt-5">
            <Button
              variant="secondary"
              onClick={() => setRejectTarget(null)}
              className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
            >
              취소
            </Button>
            <Button
              onClick={submitRejectRental}
              disabled={isSubmitting}
              className={`h-[40px] rounded-[6px] ${BUTTON_MOTION_CLASS}`}
            >
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-sm gap-0 border-0 bg-white p-0 shadow-none">
          <AlertDialogHeader className="px-6 pt-6 pb-4">
            <AlertDialogTitle className="text-base font-semibold">
              도서 삭제
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title} 도서를 삭제합니다. 삭제 후에는 복구할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 pt-2">
            <AlertDialogCancel
              className={`h-[40px] border-0 bg-secondary shadow-none hover:bg-secondary/80 ${BUTTON_MOTION_CLASS}`}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void deleteBook();
              }}
              className={`h-[40px] shadow-none ${BUTTON_MOTION_CLASS}`}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function createEmptyBookForm(): BookForm {
  return {
    title: "",
    author: "",
    memo: "",
    status: "available",
    rentalPeriodDaysOverride: "",
  };
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-[#1d1d1f]">
        {label}
      </Label>
      {children}
    </div>
  );
}

function DateLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-xs tabular-nums">
      {label} {value ? dayjs(value).format("YYYY.MM.DD HH:mm") : "-"}
    </div>
  );
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status?: BookRentalStatus;
}) {
  return (
    <Badge
      variant="secondary"
      className={`min-w-[72px] justify-center border-0 shadow-none ${getStatusBadgeClass(status)}`}
    >
      {label}
    </Badge>
  );
}

function getStatusBadgeClass(status?: BookRentalStatus) {
  switch (status) {
    case "pending":
      return "bg-[#e2e8f0] text-[#334155]";
    case "approved":
      return "bg-[#f1f5f9] text-[#475569]";
    case "rejected":
      return "bg-[#f1f5f9] text-[#475569]";
    case "return_requested":
      return "bg-[#f1f5f9] text-[#475569]";
    case "returned":
      return "bg-[#f1f5f9] text-[#334155]";
    default:
      return "bg-[#f5f5f7] text-[#424245]";
  }
}
