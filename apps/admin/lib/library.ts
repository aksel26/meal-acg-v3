import { createServiceClient } from "@/lib/supabase/server";
import type {
  BookRentalStatus,
  BookStatus,
  LibraryAdminOverview,
  LibraryBook,
  LibraryRental,
  LibrarySettings,
} from "@/lib/library-types";
import { getJoinedItem } from "@/lib/library-types";

export const LIBRARY_LOAD_ERROR_MESSAGE = "도서관 정보를 불러오지 못했습니다.";

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function normalizeBookStatus(value: unknown): BookStatus {
  const status = normalizeText(value) || "available";
  if (status === "available" || status === "disabled") return status;
  throw new Error("도서 상태를 확인해주세요.");
}

export function normalizeRentalStatus(value: unknown): BookRentalStatus {
  const status = normalizeText(value);
  if (
    status === "pending" ||
    status === "approved" ||
    status === "rejected" ||
    status === "return_requested" ||
    status === "returned"
  ) {
    return status;
  }
  throw new Error("대여 상태를 확인해주세요.");
}

export function assertBookPayload(body: unknown) {
  const record = body as Record<string, unknown>;
  const title = normalizeText(record.title);
  if (!title) throw new Error("도서명을 입력해주세요.");

  return {
    title,
    author: normalizeText(record.author) || null,
    memo: normalizeText(record.memo) || null,
    status: normalizeBookStatus(record.status),
    rental_period_days_override: normalizePositiveInteger(
      record.rentalPeriodDaysOverride,
    ),
  };
}

export function assertLibrarySettingsPayload(body: unknown) {
  const record = body as Record<string, unknown>;
  const defaultRentalPeriodDays = normalizePositiveInteger(
    record.defaultRentalPeriodDays,
  );
  if (!defaultRentalPeriodDays) {
    throw new Error("기본 대여 기간은 1일 이상이어야 합니다.");
  }
  return { defaultRentalPeriodDays };
}

export function assertRentalDecisionPayload(body: unknown) {
  const record = body as Record<string, unknown>;
  const status = normalizeRentalStatus(record.status);
  const rejectReason = normalizeText(record.rejectReason);

  if (status !== "approved" && status !== "rejected") {
    throw new Error("승인 또는 반려만 처리할 수 있습니다.");
  }
  if (status === "rejected" && !rejectReason) {
    throw new Error("반려 사유를 입력해주세요.");
  }

  return { status, rejectReason: rejectReason || null };
}

export async function listLibraryAdminOverview(): Promise<LibraryAdminOverview> {
  const supabase = createServiceClient() as any;
  const [
    { data: books, error: bookError },
    { data: settings, error: settingsError },
    { data: rentals, error: rentalError },
  ] = await Promise.all([
    supabase.from("books").select("*").order("title", { ascending: true }),
    supabase.from("library_settings").select("*").eq("id", "default").single(),
    supabase
      .from("book_rentals")
      .select(
        `
          *,
          book:books!book_rentals_book_id_fkey(id, title, author),
          requester:members!book_rentals_requester_id_fkey(
            id,
            full_name,
            team:teams!members_team_id_fkey(name)
          ),
          processor:members!book_rentals_processed_by_fkey(
            id,
            full_name,
            team:teams!members_team_id_fkey(name)
          )
        `,
      )
      .order("created_at", { ascending: false }),
  ]);

  if (bookError) throw new Error("도서 목록을 불러오지 못했습니다.");
  if (settingsError) throw new Error("도서관 설정을 불러오지 못했습니다.");
  if (rentalError) throw new Error("도서 대여 내역을 불러오지 못했습니다.");

  return {
    books: (books ?? []) as LibraryBook[],
    settings: settings as LibrarySettings,
    rentals: ((rentals ?? []) as LibraryRental[]).map((rental) => ({
      ...rental,
      book: getJoinedItem(rental.book),
      requester: getJoinedItem(rental.requester),
      processor: getJoinedItem(rental.processor),
    })),
  };
}
