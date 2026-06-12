"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { BookOpen, CheckCircle2, RotateCcw, Search } from "lucide-react";
import type {
  BookRentalStatus,
  LibraryRental,
  LibraryUserState,
} from "@/lib/library";
import {
  BOOK_AVAILABILITY_LABEL,
  BOOK_RENTAL_STATUS_LABEL,
  getBookAvailability,
  getJoinedItem,
  getRentalDayState,
  getTeamName,
} from "@/lib/library";

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

export function UserLibraryClient({
  initialData,
  userName,
}: {
  initialData: LibraryUserState;
  userName: string;
}) {
  const [data, setData] = useState(initialData);
  const [keyword, setKeyword] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredBooks = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return data.books.filter((book) => {
      if (!normalized) return true;
      return [book.title, book.author, book.memo]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [data.books, keyword]);

  const myActiveRentalIds = new Set(
    data.myRentals
      .filter((rental) =>
        ["pending", "approved", "return_requested"].includes(rental.status),
      )
      .map((rental) => rental.book_id),
  );

  const rentableCount = data.books.filter(
    (book) => getBookAvailability(book, data.activeRentals) === "rentable",
  ).length;

  async function refresh() {
    const response = await fetch(`/api/library?ts=${Date.now()}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "도서관 정보를 불러오지 못했습니다.");
    }
    setData(payload);
  }

  async function requestRental(bookId: string) {
    setIsSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch("/api/library/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "도서 대여 신청 실패");
      }
      setNotice({ tone: "success", text: "도서 대여 신청을 등록했습니다." });
      await refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "도서 대여 신청 실패",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestReturn(rentalId: string) {
    setIsSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/library/rentals/${rentalId}/return`, {
        method: "PATCH",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "도서 반납 신청 실패");
      }
      setNotice({
        tone: "success",
        text: "반납 신청이 접수되었습니다. P&C 확인 후 완료 처리됩니다.",
      });
      await refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "도서 반납 신청 실패",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">도서관</h1>
          <p className="mt-1 text-sm text-slate-500">
            {userName}님 · 대여 가능 {rentableCount}권 · 기본 대여 기간{" "}
            {data.settings.default_rental_period_days}일
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="도서명, 저자 검색"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredBooks.map((book) => {
          const availability = getBookAvailability(book, data.activeRentals);
          const activeRental = data.activeRentals.find(
            (rental) => rental.book_id === book.id,
          );
          const requester = getJoinedItem(activeRental?.requester);
          const isRentable = availability === "rentable";
          const isMine = myActiveRentalIds.has(book.id);
          return (
            <article
              key={book.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <h2 className="truncate text-base font-semibold text-slate-950">
                      {book.title}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {book.author || "저자 미입력"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${getAvailabilityBadgeClass(
                    availability,
                  )}`}
                >
                  {BOOK_AVAILABILITY_LABEL[availability]}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div>
                  대여 기간{" "}
                  {book.rental_period_days_override
                    ? `${book.rental_period_days_override}일`
                    : `기본 ${data.settings.default_rental_period_days}일`}
                </div>
                <div>
                  대여중 인원{" "}
                  {requester ? (
                    <span className="font-medium text-slate-900">
                      {requester.full_name || "-"} ·{" "}
                      {getTeamName(requester.team) || "-"}
                    </span>
                  ) : (
                    <span className="text-slate-400">없음</span>
                  )}
                </div>
                {book.memo && <p className="text-slate-500">{book.memo}</p>}
              </div>

              <button
                type="button"
                disabled={!isRentable || isMine || isSubmitting}
                onClick={() => requestRental(book.id)}
                className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {isMine ? "신청/대여중" : isRentable ? "대여 신청" : "대여 불가"}
              </button>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">나의 대여 내역</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data.myRentals.map((rental) => (
            <RentalRow
              key={rental.id}
              rental={rental}
              isSubmitting={isSubmitting}
              onReturn={() => requestReturn(rental.id)}
            />
          ))}
          {!data.myRentals.length && (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              대여 내역이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RentalRow({
  rental,
  isSubmitting,
  onReturn,
}: {
  rental: LibraryRental;
  isSubmitting: boolean;
  onReturn: () => void;
}) {
  const book = getJoinedItem(rental.book);
  const dayState = getRentalDayState(rental.due_at, rental.returned_at);

  return (
    <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(220px,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-950">
          {book?.title || "-"}
        </div>
        <div className="text-sm text-slate-500">
          {book?.author || "저자 미입력"}
        </div>
        {rental.reject_reason && (
          <div className="mt-1 text-xs text-rose-600">
            반려 사유: {rental.reject_reason}
          </div>
        )}
      </div>
      <div className="space-y-1 text-xs text-slate-500">
        <div>신청날짜 {formatDate(rental.requested_at)}</div>
        <div>승인날짜 {formatDate(rental.approved_at)}</div>
        <div>대여날짜 {formatDate(rental.rented_at)}</div>
        <div>반납신청 {formatDate(rental.return_requested_at)}</div>
        <div>반납날짜 {formatDate(rental.returned_at)}</div>
        <div>
          {dayState.remainingDays !== null && (
            <span className="font-medium text-blue-600">
              {dayState.remainingDays}일 남음
            </span>
          )}
          {dayState.overdueDays !== null && (
            <span className="font-medium text-rose-600">
              {dayState.overdueDays}일 초과
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 md:items-end">
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getRentalBadgeClass(
            rental.status,
          )}`}
        >
          {rental.status === "returned" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : null}
          {BOOK_RENTAL_STATUS_LABEL[rental.status]}
        </span>
        {rental.status === "approved" && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onReturn}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            반납하기
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  return value ? dayjs(value).format("YYYY.MM.DD HH:mm") : "-";
}

function getAvailabilityBadgeClass(availability: string) {
  switch (availability) {
    case "rentable":
      return "bg-emerald-50 text-emerald-700";
    case "rented":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getRentalBadgeClass(status: BookRentalStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700";
    case "approved":
      return "bg-blue-50 text-blue-700";
    case "rejected":
      return "bg-rose-50 text-rose-700";
    case "return_requested":
      return "bg-orange-50 text-orange-700";
    case "returned":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}
