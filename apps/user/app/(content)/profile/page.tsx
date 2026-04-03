"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Input } from "@repo/ui/src/input";
import { Button } from "@repo/ui/src/button";
import { Label } from "@repo/ui/src/label";
import { Eye, EyeOff, Building2, Briefcase, Mail, Phone, KeyRound, Calendar, CreditCard, Copy, Pencil, Check, X } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useProfile, useUpdateProfile, useChangePassword } from "@/hooks/use-profile";
import dayjs from "dayjs";

export default function ProfilePage() {
  const { userName, memberId, hireDate, setMemberInfo } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원", memberLookup.hire_date);
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const currentMemberId = memberId || memberLookup?.id || null;
  const { data: profile, isLoading } = useProfile(currentMemberId);
  const updateMutation = useUpdateProfile();
  const passwordMutation = useChangePassword();

  // 개인정보 수정 폼
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [editingField, setEditingField] = useState<"email" | "phone" | "passport" | null>(null);
  const [editValue, setEditValue] = useState("");

  // 비밀번호 변경 폼
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (profile) {
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setPassportNumber(profile.passport_number || "");
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!currentMemberId) return;
    await updateMutation.mutateAsync({ memberId: currentMemberId, email, phone, passport_number: passportNumber });
  };

  const startEdit = (field: "email" | "phone" | "passport") => {
    const values = { email, phone, passport: passportNumber };
    setEditValue(values[field]);
    setEditingField(field);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!currentMemberId || !editingField) return;
    const params: Record<string, string> = { memberId: currentMemberId };
    if (editingField === "email") {
      params.email = editValue;
      setEmail(editValue);
    } else if (editingField === "phone") {
      params.phone = editValue;
      setPhone(editValue);
    } else if (editingField === "passport") {
      params.passport_number = editValue.toUpperCase();
      setPassportNumber(editValue.toUpperCase());
    }
    await updateMutation.mutateAsync(params as Parameters<typeof updateMutation.mutateAsync>[0]);
    setEditingField(null);
    setEditValue("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("클립보드에 복사되었습니다."))
      .catch(() => toast.error("복사에 실패했습니다."));
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!currentMemberId) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("모든 필드를 입력해주세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError("새 비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    try {
      await passwordMutation.mutateAsync({
        memberId: currentMemberId,
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      // error handled by mutation
    }
  };

  const daysFromHire = hireDate ? dayjs().diff(dayjs(hireDate), "day") : null;

  const statusLabel = (status: string | null) => {
    if (!status || status === "재직") return "재직";
    return status;
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  // 프로필 카드 콘텐츠
  const profileCard = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="rounded-2xl bg-gray-50 p-5">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {profile.position_name}
            {profile.title_name ? ` · ${profile.title_name}` : ""}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-white p-3">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400">소속</p>
              <p className="text-sm font-medium text-slate-800">
                {profile.division_name || "-"} / {profile.team_name || "-"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white p-3">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400">재직 상태</p>
              <p className="text-sm font-medium text-slate-800">
                {statusLabel(profile.current_status)}
                {daysFromHire !== null && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    D+{daysFromHire}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white p-3">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400">이메일</p>
              {editingField === "email" ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input type="email" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 min-w-0 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 outline-none focus:border-blue-400" autoFocus />
                  <button onClick={saveEdit} disabled={updateMutation.isPending} className="p-1 text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                  <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-800">{email || "-"}</p>
              )}
            </div>
            {editingField !== "email" && (
              <button onClick={() => startEdit("email")} className="p-1 text-slate-300 hover:text-slate-500 shrink-0"><Pencil className="h-3.5 w-3.5" /></button>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white p-3">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400">연락처</p>
              {editingField === "phone" ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input type="tel" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 min-w-0 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 outline-none focus:border-blue-400" autoFocus />
                  <button onClick={saveEdit} disabled={updateMutation.isPending} className="p-1 text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                  <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-800">{phone || "-"}</p>
              )}
            </div>
            {editingField !== "phone" && (
              <button onClick={() => startEdit("phone")} className="p-1 text-slate-300 hover:text-slate-500 shrink-0"><Pencil className="h-3.5 w-3.5" /></button>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white p-3">
            <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400">여권번호</p>
              {editingField === "passport" ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value.toUpperCase())} className="flex-1 min-w-0 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 outline-none focus:border-blue-400" autoFocus />
                  <button onClick={saveEdit} disabled={updateMutation.isPending} className="p-1 text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                  <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-800">{passportNumber || "-"}</p>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {editingField !== "passport" && (
                <>
                  {passportNumber && (
                    <button onClick={() => copyToClipboard(passportNumber)} className="p-1 text-slate-300 hover:text-slate-500"><Copy className="h-3.5 w-3.5" /></button>
                  )}
                  <button onClick={() => startEdit("passport")} className="p-1 text-slate-300 hover:text-slate-500"><Pencil className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white p-3">
            <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400">아이디</p>
              <p className="text-sm font-medium text-slate-800">{profile.login_id || "-"}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // 수정 폼 콘텐츠
  const editForms = (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="rounded-2xl bg-gray-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">비밀번호 변경</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="currentPw" className="text-xs text-slate-500">현재 비밀번호</Label>
              <div className="relative">
                <Input
                  id="currentPw"
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPw" className="text-xs text-slate-500">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="newPw"
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPw" className="text-xs text-slate-500">새 비밀번호 확인</Label>
              <Input
                id="confirmPw"
                type={showNewPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
            <Button
              onClick={handleChangePassword}
              disabled={passwordMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {passwordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <React.Fragment>
      {/* Mobile */}
      <div className="md:hidden space-y-6">
        {profileCard}
        {editForms}
      </div>

      {/* PC */}
      <div className="max-md:hidden grid grid-cols-2 gap-6">
        <div>{profileCard}</div>
        <div>{editForms}</div>
      </div>
    </React.Fragment>
  );
}
