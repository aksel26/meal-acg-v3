"use client";

import { ChevronRight } from "lucide-react";

type Props = {
  isActive: boolean;
};

export default function FlowConnector({ isActive }: Props) {
  return (
    <div className="flex shrink-0 items-center px-1">
      <ChevronRight
        className={`h-5 w-5 ${isActive ? "text-indigo-400" : "text-slate-300"}`}
      />
    </div>
  );
}
