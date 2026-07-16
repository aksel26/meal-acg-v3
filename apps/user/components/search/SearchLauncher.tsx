"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { RequestSearchDialog } from "./RequestSearchDialog";

export function SearchLauncher() {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setOpen((current) => !current);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl px-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
        title={`업무 요청 검색 (${isMac ? "⌘" : "Ctrl"}+K)`}
        aria-label={`업무 요청 검색 (${isMac ? "⌘" : "Ctrl"}+K)`}
      >
        <Search size={16} strokeWidth={1.5} />
        <kbd className="hidden items-center gap-0.5 rounded border border-[#e5e7eb] bg-[#f9f9fa] px-1 py-0.5 text-[10px] font-medium leading-none text-slate-500 sm:inline-flex">
          {isMac ? "⌘" : "Ctrl"}
          <span>K</span>
        </kbd>
      </button>
      <RequestSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
