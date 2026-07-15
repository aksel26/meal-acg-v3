"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import dayjs from "dayjs";
import { Check, Pencil, Plus, Search, Trash2, Undo2, X } from "lucide-react";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Textarea } from "@repo/ui/src/textarea";
import { toast } from "@repo/ui/src/sonner";
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
      if (rentalStatusFilter !== "all" && rental.status !== rentalStatusFilter) {
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

  async function deleteBook(book: LibraryBook) {
    if (!confirm(`${book.title} 도서를 삭제할까요?`)) return;
    try {
      await mutations.deleteBook.mutateAsync(book.id);
      toast.success("도서를 삭제했습니다.");
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
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">도서 관리</h1>
          <p className="mt-1 text-sm text-[#86868b]">
            대여 가능 {rentableCount}권 · 대여중 {rentedCount}권 · 승인대기{" "}
            {pendingCount}건
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
            <span className="text-sm text-[#6e6e73]">기본 대여 기간</span>
            <Input
              value={settingsValue}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setSettingsValue(event.target.value)
              }
              className="h-8 w-20"
              inputMode="numeric"
            />
            <span className="text-sm text-[#6e6e73]">일</span>
            <Button
              size="sm"
              variant="outline"
              disabled={isSubmitting}
              onClick={saveSettings}
            >
              저장
            </Button>
          </div>
          <Button onClick={openCreateBook} disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            도서 추가
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
          <Input
          value={keyword}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setKeyword(event.target.value)
          }
            placeholder="도서명, 저자, 신청자 검색"
            className="pl-9"
          />
        </div>
        <select
          value={rentalStatusFilter}
          onChange={(event) =>
            setRentalStatusFilter(event.target.value as BookRentalStatus | "all")
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {RENTAL_STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {RENTAL_STATUS_FILTER_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <section className="rounded-lg border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-[#1d1d1f]">도서 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#f5f5f7] text-left text-xs font-medium text-[#6e6e73]">
              <tr>
                <th className="px-5 py-3">도서</th>
                <th className="px-5 py-3">대여 가능여부</th>
                <th className="px-5 py-3">대여중 인원</th>
                <th className="px-5 py-3">대여 기간</th>
                <th className="px-5 py-3">메모</th>
                <th className="px-5 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
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
                  <tr key={book.id}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#1d1d1f]">
                        {book.title}
                      </div>
                      <div className="text-xs text-[#86868b]">
                        {book.author || "저자 미입력"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge label={BOOK_AVAILABILITY_LABEL[availability]} />
                    </td>
                    <td className="px-5 py-4">
                      {requester ? (
                        <div>
                          <div className="font-medium text-[#1d1d1f]">
                            {requester.full_name || "-"}
                          </div>
                          <div className="text-xs text-[#86868b]">
                            {getTeamName(requester.team) || "-"} ·{" "}
                            {activeRental
                              ? BOOK_RENTAL_STATUS_LABEL[activeRental.status]
                              : "-"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {book.rental_period_days_override
                        ? `${book.rental_period_days_override}일`
                        : `기본 ${data.settings.default_rental_period_days}일`}
                    </td>
                    <td className="max-w-[240px] px-5 py-4 text-[#6e6e73]">
                      {book.memo || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditBook(book)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBook(book)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!bookRows.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#86868b]">
                    등록된 도서가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-[#1d1d1f]">대여 신청 현황</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-[#f5f5f7] text-left text-xs font-medium text-[#6e6e73]">
              <tr>
                <th className="px-5 py-3">도서</th>
                <th className="px-5 py-3">신청자</th>
                <th className="px-5 py-3">상태</th>
                <th className="px-5 py-3">신청/승인일</th>
                <th className="px-5 py-3">대여/반납일</th>
                <th className="px-5 py-3">잔여/초과</th>
                <th className="px-5 py-3 text-right">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rentalRows.map((rental) => {
                const book = getJoinedItem(rental.book);
                const requester = getJoinedItem(rental.requester);
                const processor = getJoinedItem(rental.processor);
                const dayState = getRentalDayState(
                  rental.due_at,
                  rental.returned_at,
                );
                return (
                  <tr key={rental.id}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#1d1d1f]">
                        {book?.title || "-"}
                      </div>
                      <div className="text-xs text-[#86868b]">
                        {book?.author || "저자 미입력"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#1d1d1f]">
                        {requester?.full_name || "-"}
                      </div>
                      <div className="text-xs text-[#86868b]">
                        {getTeamName(requester?.team) || "-"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label={BOOK_RENTAL_STATUS_LABEL[rental.status]}
                        status={rental.status}
                      />
                      {rental.reject_reason && (
                        <div className="mt-1 max-w-[220px] text-xs text-[#86868b]">
                          {rental.reject_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#6e6e73]">
                      <DateLine label="신청" value={rental.requested_at} />
                      <DateLine label="승인" value={rental.approved_at} />
                      {processor && (
                        <div className="text-xs">처리자 {processor.full_name}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#6e6e73]">
                      <DateLine label="대여" value={rental.rented_at} />
                      <DateLine label="반납" value={rental.returned_at} />
                      <DateLine label="반납요청" value={rental.return_requested_at} />
                    </td>
                    <td className="px-5 py-4">
                      {dayState.remainingDays !== null && (
                        <span className="font-medium text-[#64748b]">
                          {dayState.remainingDays}일 남음
                        </span>
                      )}
                      {dayState.overdueDays !== null && (
                        <span className="font-medium text-[#64748b]">
                          {dayState.overdueDays}일 초과
                        </span>
                      )}
                      {dayState.remainingDays === null &&
                        dayState.overdueDays === null && (
                          <span className="text-[#86868b]">-</span>
                        )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {rental.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveRental(rental)}
                              disabled={isSubmitting}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectTarget(rental)}
                              disabled={isSubmitting}
                            >
                              <X className="mr-1 h-4 w-4" />
                              반려
                            </Button>
                          </>
                        )}
                        {rental.status === "return_requested" && (
                          <Button
                            size="sm"
                            onClick={() => confirmReturn(rental)}
                            disabled={isSubmitting}
                          >
                            <Undo2 className="mr-1 h-4 w-4" />
                            반납완료
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rentalRows.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#86868b]">
                    대여 신청 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingBook ? "도서 정보 수정" : "도서 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="도서명">
              <Input
                value={bookForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBookForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </Field>
            <Field label="저자">
              <Input
                value={bookForm.author}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBookForm((prev) => ({ ...prev, author: event.target.value }))
                }
              />
            </Field>
            <Field label="상태">
              <select
                value={bookForm.status}
                onChange={(event) =>
                  setBookForm((prev) => ({
                    ...prev,
                    status: event.target.value as BookStatus,
                  }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(BOOK_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="대여 기간 override">
              <Input
                value={bookForm.rentalPeriodDaysOverride}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBookForm((prev) => ({
                    ...prev,
                    rentalPeriodDaysOverride: event.target.value,
                  }))
                }
                placeholder={`비우면 기본 ${data.settings.default_rental_period_days}일`}
                inputMode="numeric"
              />
            </Field>
            <Field label="메모">
              <Textarea
                value={bookForm.memo}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setBookForm((prev) => ({ ...prev, memo: event.target.value }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={submitBook} disabled={isSubmitting}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>대여 신청 반려</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setRejectReason(event.target.value)
            }
            placeholder="반려 사유"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button onClick={submitRejectRental} disabled={isSubmitting}>
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#1d1d1f]">{label}</span>
      {children}
    </label>
  );
}

function DateLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-xs">
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
      className={`min-w-[72px] justify-center ${getStatusBadgeClass(status)}`}
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
