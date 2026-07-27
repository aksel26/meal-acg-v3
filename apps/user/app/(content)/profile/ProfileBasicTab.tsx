"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Input } from "@repo/ui/src/input";
import { Button } from "@repo/ui/src/button";
import { Label } from "@repo/ui/src/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  Eye,
  EyeOff,
  KeyRound,
  Copy,
  Pencil,
  Check,
  X
} from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { useUpdateProfile, useChangePassword, type ProfileData } from "@/hooks/use-profile";
import dayjs from "dayjs";
import ProfileHrCard from "./ProfileHrCard";

interface ProfileBasicTabProps {
  profile: ProfileData;
  memberId: string;
  hireDate: string | null;
}

export default function ProfileBasicTab({ profile, memberId, hireDate }: ProfileBasicTabProps) {
  const updateMutation = useUpdateProfile();
  const passwordMutation = useChangePassword();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [editingField, setEditingField] = useState<"email" | "phone" | "passport" | null>(null);
  const [editValue, setEditValue] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setPassportNumber(profile.passport_number || "");
    }
  }, [profile]);

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
    if (!editingField) return;
    const params: Record<string, string> = { memberId };
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
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("클립보드에 복사되었습니다."))
      .catch(() => toast.error("복사에 실패했습니다."));
  };

  const handleChangePassword = async () => {
    setPasswordError("");
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
        memberId,
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordDialogOpen(false);
    } catch {
      // error handled by mutation
    }
  };

  const daysFromHire = hireDate ? dayjs().diff(dayjs(hireDate), "day") : null;

  const statusLabel = (status: string | null) => {
    if (!status || status === "재직") return "재직";
    return status;
  };

  const profileCard = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {profile.position_name}
            {profile.title_name ? ` · ${profile.title_name}` : ""}
          </p>
        </div>

        <div>
          <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center border-b border-slate-100 py-3">
            <span className="text-xs text-slate-500">소속</span>
            <span className="text-sm font-medium text-slate-800">
              {profile.division_name || "-"} / {profile.team_name || "-"}
            </span>
          </div>

          <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center border-b border-slate-100 py-3">
            <span className="text-xs text-slate-500">재직 상태</span>
            <span className="text-sm font-medium text-slate-800">
              {statusLabel(profile.current_status)}
              {daysFromHire !== null && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  D+{daysFromHire}
                </span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-[100px_minmax(0,1fr)_auto] items-center border-b border-slate-100 py-3">
            <span className="text-xs text-slate-500">이메일</span>
            <div className="min-w-0 flex-1">
              {editingField === "email" ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="email"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 outline-none focus:border-blue-400"
                    autoFocus
                  />
                  <button onClick={saveEdit} disabled={updateMutation.isPending} className="p-1 text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                  <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-800">{email || "-"}</p>
              )}
            </div>
            {editingField !== "email" && (
              <button onClick={() => startEdit("email")} className="shrink-0 p-1 text-slate-300 hover:text-slate-500"><Pencil className="h-3.5 w-3.5" /></button>
            )}
          </div>

          <div className="grid grid-cols-[100px_minmax(0,1fr)_auto] items-center border-b border-slate-100 py-3">
            <span className="text-xs text-slate-500">연락처</span>
            <div className="min-w-0 flex-1">
              {editingField === "phone" ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="tel"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 outline-none focus:border-blue-400"
                    autoFocus
                  />
                  <button onClick={saveEdit} disabled={updateMutation.isPending} className="p-1 text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                  <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-800">{phone || "-"}</p>
              )}
            </div>
            {editingField !== "phone" && (
              <button onClick={() => startEdit("phone")} className="shrink-0 p-1 text-slate-300 hover:text-slate-500"><Pencil className="h-3.5 w-3.5" /></button>
            )}
          </div>

          <div className="grid grid-cols-[100px_minmax(0,1fr)_auto] items-center border-b border-slate-100 py-3">
            <span className="text-xs text-slate-500">여권번호</span>
            <div className="min-w-0 flex-1">
              {editingField === "passport" ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                    className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 outline-none focus:border-blue-400"
                    autoFocus
                  />
                  <button onClick={saveEdit} disabled={updateMutation.isPending} className="p-1 text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                  <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-800">{passportNumber || "-"}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
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

          <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center border-b border-slate-100 py-3">
            <span className="text-xs text-slate-500">아이디</span>
            <span className="text-sm font-medium text-slate-800">
              {profile.login_id || "-"}
            </span>
          </div>
          <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center border-b border-slate-100 py-3">
            <span className="text-xs text-slate-500">비밀번호</span>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
              >
                변경하기
              </Button>
            </div>
          </div>
          <ProfileHrCard />
        </div>
      </section>
    </motion.div>
  );

  return (
    <>
      {profileCard}
      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordError("");
            setShowCurrentPw(false);
            setShowNewPw(false);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-500" />
              비밀번호 변경
            </DialogTitle>
            <DialogDescription>
              현재 비밀번호를 확인한 후 새 비밀번호를 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="currentPw" className="text-xs text-slate-500">현재 비밀번호</Label>
              <div className="relative">
                <Input id="currentPw" type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPw" className="text-xs text-slate-500">새 비밀번호</Label>
              <div className="relative">
                <Input id="newPw" type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPw" className="text-xs text-slate-500">새 비밀번호 확인</Label>
              <Input id="confirmPw" type={showNewPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleChangePassword}
              disabled={passwordMutation.isPending}
            >
              {passwordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
