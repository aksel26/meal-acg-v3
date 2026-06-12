import { createServiceClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/auth";

export type BookStatus = "available" | "disabled";
export type BookAvailability = "rentable" | "rented" | "disabled";
export type BookRentalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "return_requested"
  | "returned";

export interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  memo: string | null;
  status: BookStatus;
  rental_period_days_override: number | null;
  created_at: string;
  updated_at: string;
}

export interface LibrarySettings {
  id: "default";
  default_rental_period_days: number;
  updated_at: string;
}

export interface LibraryRentalMember {
  id: string;
  full_name: string | null;
  team?: { name: string | null } | { name: string | null }[] | null;
}

export interface LibraryRental {
  id: string;
  book_id: string;
  requester_id: string;
  status: BookRentalStatus;
  requested_at: string;
  approved_at: string | null;
  rented_at: string | null;
  due_at: string | null;
  return_requested_at: string | null;
  returned_at: string | null;
  processed_by: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  book?:
    | Pick<LibraryBook, "id" | "title" | "author">
    | Pick<LibraryBook, "id" | "title" | "author">[]
    | null;
  requester?: LibraryRentalMember | LibraryRentalMember[] | null;
}

export interface LibraryUserState {
  books: LibraryBook[];
  settings: LibrarySettings;
  myRentals: LibraryRental[];
  activeRentals: LibraryRental[];
}

export const LIBRARY_LOAD_ERROR_MESSAGE = "도서관 정보를 불러오지 못했습니다.";

export const BOOK_AVAILABILITY_LABEL: Record<BookAvailability, string> = {
  rentable: "대여 가능",
  rented: "대여중",
  disabled: "대여중지",
};

export const BOOK_RENTAL_STATUS_LABEL: Record<BookRentalStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  return_requested: "P&C 접수중",
  returned: "반납완료",
};

export function getJoinedItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function getTeamName(
  team: { name: string | null } | { name: string | null }[] | null | undefined,
) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0]?.name ?? null;
  return team.name;
}

export function isActiveRental(
  rental: Pick<LibraryRental, "status" | "returned_at">,
) {
  return (
    (rental.status === "approved" || rental.status === "return_requested") &&
    rental.returned_at === null
  );
}

export function getBookAvailability(
  book: Pick<LibraryBook, "id" | "status">,
  rentals: Pick<LibraryRental, "book_id" | "status" | "returned_at">[],
): BookAvailability {
  if (book.status === "disabled") return "disabled";
  return rentals.some(
    (rental) => rental.book_id === book.id && isActiveRental(rental),
  )
    ? "rented"
    : "rentable";
}

export function getRentalDayState(
  dueAt: string | null,
  returnedAt: string | null,
  now = new Date(),
) {
  if (!dueAt || returnedAt) {
    return { remainingDays: null, overdueDays: null };
  }

  const due = new Date(dueAt);
  const dueStart = Date.UTC(
    due.getUTCFullYear(),
    due.getUTCMonth(),
    due.getUTCDate(),
  );
  const nowStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const diffDays = Math.ceil((dueStart - nowStart) / 86_400_000);

  return diffDays >= 0
    ? { remainingDays: diffDays, overdueDays: null }
    : { remainingDays: null, overdueDays: Math.abs(diffDays) };
}

export async function listLibraryForUser(
  session: SessionUser,
): Promise<LibraryUserState> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");

  const client = supabase as any;
  const [
    { data: books, error: bookError },
    { data: settings, error: settingsError },
    { data: myRentals, error: myRentalError },
    { data: activeRentals, error: activeRentalError },
  ] = await Promise.all([
    client
      .from("books")
      .select("*")
      .neq("status", "disabled")
      .order("title", { ascending: true }),
    client.from("library_settings").select("*").eq("id", "default").single(),
    client
      .from("book_rentals")
      .select(
        `
          *,
          book:books!book_rentals_book_id_fkey(id, title, author),
          requester:members!book_rentals_requester_id_fkey(
            id,
            full_name,
            team:teams!members_team_id_fkey(name)
          )
        `,
      )
      .eq("requester_id", session.id)
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("book_rentals")
      .select(
        `
          *,
          book:books!book_rentals_book_id_fkey(id, title, author),
          requester:members!book_rentals_requester_id_fkey(
            id,
            full_name,
            team:teams!members_team_id_fkey(name)
          )
        `,
      )
      .in("status", ["approved", "return_requested"])
      .is("returned_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (bookError) throw new Error("도서 목록을 불러오지 못했습니다.");
  if (settingsError) throw new Error("도서관 설정을 불러오지 못했습니다.");
  if (myRentalError) throw new Error("나의 대여 내역을 불러오지 못했습니다.");
  if (activeRentalError) throw new Error("대여 현황을 불러오지 못했습니다.");

  return {
    books: (books ?? []) as LibraryBook[],
    settings: settings as LibrarySettings,
    myRentals: normalizeRentals(myRentals ?? []),
    activeRentals: normalizeRentals(activeRentals ?? []),
  };
}

function normalizeRentals(rentals: LibraryRental[]) {
  return rentals.map((rental) => ({
    ...rental,
    book: getJoinedItem(rental.book),
    requester: getJoinedItem(rental.requester),
  }));
}

export function assertRentalRequestPayload(body: unknown) {
  const record = body as Record<string, unknown>;
  const bookId = typeof record.bookId === "string" ? record.bookId.trim() : "";
  if (!bookId) throw new Error("대여할 도서를 선택해주세요.");
  return { bookId };
}
