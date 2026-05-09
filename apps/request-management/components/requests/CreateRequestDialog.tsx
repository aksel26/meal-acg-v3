"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/src/dialog";
import { RequestForm } from "./RequestForm";

interface CreateRequestDialogProps {
  initialDueDate?: string;
  initialAssignees?: { id: string; fullName: string }[];
  triggerLabel?: string;
  triggerClassName?: string;
}

export function CreateRequestDialog({
  initialDueDate,
  initialAssignees,
  triggerLabel = "새 요청",
  triggerClassName,
}: CreateRequestDialogProps = {}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            "inline-flex h-10 items-center gap-1.5 rounded-md bg-[#111111] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#222222]"
          }
        >
          <Plus size={16} />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] gap-0 overflow-hidden p-0"
        style={{ maxWidth: "min(560px, calc(100% - 2rem))" }}
      >
        <DialogHeader className="border-b border-[#f3f3f3] px-5 py-4">
          <DialogTitle>새 요청</DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(85vh-73px)] overflow-y-auto px-5 py-5">
          <RequestForm
            initialDueDate={initialDueDate}
            initialAssignees={initialAssignees}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
