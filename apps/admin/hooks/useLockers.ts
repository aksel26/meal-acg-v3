"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { LockerAdminOverview } from "@/lib/facilities-types";

async function fetchLockerOverview(): Promise<LockerAdminOverview> {
  const res = await fetch("/api/lockers", { cache: "no-store" });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "사물함 관리 정보를 불러오지 못했습니다.");
  }
  return payload as LockerAdminOverview;
}

export function useLockers(initialData: LockerAdminOverview) {
  return useQuery({
    queryKey: queryKeys.lockers.all,
    queryFn: fetchLockerOverview,
    initialData,
  });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "요청 처리에 실패했습니다.");
  }
  return payload as T;
}

export function useLockerMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.lockers.all });

  const createLocker = useMutation({
    mutationFn: (form: Record<string, unknown>) =>
      requestJson("/api/lockers", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: invalidate,
  });

  const processRequest = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) =>
      requestJson(`/api/lockers/requests/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidate,
  });

  const assignLocker = useMutation({
    mutationFn: ({ lockerId, memberId }: { lockerId: string; memberId: string }) =>
      requestJson(`/api/lockers/${lockerId}/assignment`, {
        method: "PUT",
        body: JSON.stringify({ memberId }),
      }),
    onSuccess: invalidate,
  });

  const releaseLocker = useMutation({
    mutationFn: (lockerId: string) =>
      requestJson(`/api/lockers/${lockerId}/assignment`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return { createLocker, processRequest, assignLocker, releaseLocker };
}
