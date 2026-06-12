"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type {
  BookRentalStatus,
  LibraryAdminOverview,
} from "@/lib/library-types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "요청 처리에 실패했습니다.");
  }
  return payload as T;
}

async function fetchLibraryOverview(): Promise<LibraryAdminOverview> {
  return requestJson<LibraryAdminOverview>("/api/library", {
    cache: "no-store",
  });
}

export function useLibrary(initialData: LibraryAdminOverview) {
  return useQuery({
    queryKey: queryKeys.library.all,
    queryFn: fetchLibraryOverview,
    initialData,
  });
}

export function useLibraryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.library.all });

  const createBook = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      requestJson("/api/library/books", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidate,
  });

  const updateBook = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) =>
      requestJson(`/api/library/books/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidate,
  });

  const deleteBook = useMutation({
    mutationFn: (id: string) =>
      requestJson(`/api/library/books/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const saveSettings = useMutation({
    mutationFn: (defaultRentalPeriodDays: number) =>
      requestJson("/api/library/settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultRentalPeriodDays }),
      }),
    onSuccess: invalidate,
  });

  const decideRental = useMutation({
    mutationFn: ({
      id,
      status,
      rejectReason,
    }: {
      id: string;
      status: Extract<BookRentalStatus, "approved" | "rejected">;
      rejectReason?: string | null;
    }) =>
      requestJson(`/api/library/rentals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, rejectReason }),
      }),
    onSuccess: invalidate,
  });

  const confirmReturn = useMutation({
    mutationFn: (id: string) =>
      requestJson(`/api/library/rentals/${id}/return`, { method: "PATCH" }),
    onSuccess: invalidate,
  });

  return {
    createBook,
    updateBook,
    deleteBook,
    saveSettings,
    decideRental,
    confirmReturn,
  };
}
