"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

// ── Division Mutations ──

export function useCreateDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; organization_id: string }) => {
      const res = await fetch("/api/divisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create division");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.divisions.all });
      toast.success("본부가 추가되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "본부 추가에 실패했습니다.");
    },
  });
}

export function useUpdateDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/divisions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update division");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.divisions.all });
      toast.success("본부 이름이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "본부 수정에 실패했습니다.");
    },
  });
}

export function useDeleteDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/divisions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete division");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.divisions.all });
      toast.success("본부가 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "본부 삭제에 실패했습니다.");
    },
  });
}

// ── Team Mutations ──

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      organization_id: string;
      division_id?: string | null;
    }) => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create team");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      toast.success("팀이 추가되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "팀 추가에 실패했습니다.");
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      division_id,
    }: {
      id: string;
      name: string;
      division_id?: string | null;
    }) => {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, division_id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update team");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      toast.success("팀이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "팀 수정에 실패했습니다.");
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teams/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete team");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      toast.success("팀이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "팀 삭제에 실패했습니다.");
    },
  });
}

// ── Member Organization Mutations ──

export function useUpdateMemberOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      team_id,
      division_id,
      member_role,
      intern_months,
    }: {
      id: string;
      team_id?: string | null;
      division_id?: string | null;
      member_role?: "본부장" | "팀장" | "팀원" | "인턴";
      intern_months?: number | null;
    }) => {
      const res = await fetch(`/api/members/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id, division_id, member_role, intern_months }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.memberStatuses.all });
      toast.success("멤버 정보가 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "멤버 수정에 실패했습니다.");
    },
  });
}

export function useBatchAssignMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberIds,
      team_id,
    }: {
      memberIds: string[];
      team_id: string;
    }) => {
      const results = await Promise.all(
        memberIds.map(async (id) => {
          const res = await fetch(`/api/members/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team_id }),
          });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || `Failed to assign member ${id}`);
          }
          return res.json();
        })
      );
      return results;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.memberStatuses.all });
      toast.success(`${variables.memberIds.length}명이 팀에 배정되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "멤버 배정에 실패했습니다.");
    },
  });
}
