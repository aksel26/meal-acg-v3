import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";

export interface ProfileData {
  member_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  login_id: string | null;
  member_role: string | null;
  team_id: string | null;
  team_name: string | null;
  division_id: string | null;
  division_name: string | null;
  position_id: string | null;
  position_name: string | null;
  title_id: string | null;
  title_name: string | null;
  current_status: string | null;
  status_start_date: string | null;
  status_end_date: string | null;
  passport_number: string | null;
  birth_date: string | null;
}

async function fetchProfile(memberId: string): Promise<ProfileData> {
  const res = await fetch(`/api/profile?memberId=${memberId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "프로필 조회 실패");
  return data;
}

export function useProfile(memberId: string | null) {
  return useQuery({
    queryKey: ["profile", memberId],
    queryFn: () => fetchProfile(memberId!),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      memberId: string;
      email?: string;
      phone?: string;
      passport_number?: string;
    }) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "프로필 수정 실패");
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["profile", variables.memberId],
      });
      toast.success("프로필이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (params: {
      memberId: string;
      currentPassword: string;
      newPassword: string;
    }) => {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "비밀번호 변경 실패");
      return data;
    },
    onSuccess: () => {
      toast.success("비밀번호가 변경되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
