"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Send, Users, UserCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import { PushNotifyDialog } from "@/components/PushNotifyDialog";
import { queryKeys } from "@/lib/query-keys";

interface MemberInfo {
  id: string;
  full_name: string;
}

export default function NotificationsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);

  const { data: members = [] } = useQuery<MemberInfo[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const selectedMembers = members.filter((m) => selectedIds.has(m.id));

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.id)));
    }
  };

  const handleSendToAll = () => {
    setSendToAll(true);
    setDialogOpen(true);
  };

  const handleSendToSelected = () => {
    setSendToAll(false);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-7 w-7 text-blue-600" />
            알림 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            조직원에게 푸시 알림을 발송합니다.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={handleSendToAll}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-blue-600" />
              전체 발송
            </CardTitle>
            <CardDescription>
              모든 조직원에게 푸시 알림을 발송합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" onClick={(e) => { e.stopPropagation(); handleSendToAll(); }}>
              <Send className="h-4 w-4" />
              전체 발송하기
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              선택 발송
            </CardTitle>
            <CardDescription>
              선택한 조직원에게만 푸시 알림을 발송합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full gap-2"
              disabled={selectedIds.size === 0}
              onClick={handleSendToSelected}
            >
              <Send className="h-4 w-4" />
              선택 발송하기 ({selectedIds.size}명)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Member List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">조직원 목록</CardTitle>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedIds.size === members.length ? "전체 해제" : "전체 선택"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50"
                >
                  <Checkbox
                    checked={selectedIds.has(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {member.full_name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <PushNotifyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedMembers={selectedMembers}
        sendToAll={sendToAll}
      />
    </div>
  );
}
