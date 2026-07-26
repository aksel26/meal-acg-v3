"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { canBeChoseong, getChoseong } from "es-hangul";
import { Search, X, Check, ChevronDown } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

// 초성 검색 매칭 확인
function matchesChosung(text: string, query: string): boolean {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();

  // 일반 텍스트 매칭
  if (lowerText.includes(lowerQuery)) return true;

  const textChoseong = getChoseong(text).toLowerCase();
  const isChoseongOnly = [...trimmedQuery].every((char) => canBeChoseong(char));

  if (isChoseongOnly) return textChoseong.includes(lowerQuery);

  return false;
}

export interface SearchableDropdownProps<T> {
  items: T[];
  value?: string;
  getItemKey: (item: T) => string;
  getItemLabel: (item: T) => string;
  renderItem?: (item: T, isHighlighted: boolean) => React.ReactNode;
  onSelect: (item: T) => void;
  onClear?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  disabled?: boolean;
  portal?: boolean;
  className?: string;
}

function SearchableDropdown<T>({
  items,
  value,
  getItemKey,
  getItemLabel,
  renderItem,
  onSelect,
  onClear,
  placeholder = "선택...",
  searchPlaceholder = "검색...",
  emptyText = "결과가 없습니다",
  allowClear = false,
  disabled = false,
  portal = false,
  className,
}: SearchableDropdownProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Find selected item
  const selectedItem = React.useMemo(() => {
    if (!value) return null;
    return items.find((item) => getItemKey(item) === value) ?? null;
  }, [items, value, getItemKey]);

  // Filter items based on query (supports Korean consonant search)
  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return items;

    return items.filter((item) => {
      const label = getItemLabel(item);
      return matchesChosung(label, query.trim());
    });
  }, [items, query, getItemLabel]);

  // Reset highlighted index when filtered items change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredItems.length]);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (disabled || isOpen) return;
    setIsOpen(true);
    setQuery("");
    setHighlightedIndex(-1);
    // Focus input after state update
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          Math.min(prev + 1, filteredItems.length - 1),
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setQuery("");
        setHighlightedIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        setQuery("");
        setHighlightedIndex(-1);
        break;
    }
  };

  const defaultRenderItem = (item: T, isHighlighted: boolean) => (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors",
        isHighlighted ? "bg-blue-50" : "hover:bg-slate-50",
      )}
    >
      <span className="text-sm">{getItemLabel(item)}</span>
      {value === getItemKey(item) && (
        <Check className="w-4 h-4 text-blue-500" />
      )}
    </div>
  );

  const dropdownItems = (
    <>
      {filteredItems.length === 0 ? (
        <div className="px-3 py-4 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div ref={listRef}>
          {filteredItems.map((item, index) => (
            <div
              key={getItemKey(item)}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={value === getItemKey(item)}
            >
              {renderItem
                ? renderItem(item, highlightedIndex === index)
                : defaultRenderItem(item, highlightedIndex === index)}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const dropdownList = !isOpen ? null : portal ? (
    <PopoverContent
      ref={menuRef}
      align="start"
      collisionPadding={8}
      onOpenAutoFocus={(event) => event.preventDefault()}
      onCloseAutoFocus={(event) => event.preventDefault()}
      onFocusOutside={(event) => event.preventDefault()}
      onInteractOutside={(event) => {
        if (containerRef.current?.contains(event.target as Node)) {
          event.preventDefault();
        }
      }}
      onWheel={(event) => event.stopPropagation()}
      className="z-[100] max-h-60 overflow-y-auto rounded-lg p-0"
      style={{
        width: containerRef.current?.offsetWidth,
        pointerEvents: "auto",
      }}
      role="listbox"
    >
      {dropdownItems}
    </PopoverContent>
  ) : (
    <div
      ref={menuRef}
      className="absolute z-[100] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-white shadow-md"
      role="listbox"
    >
      {dropdownItems}
    </div>
  );

  const trigger = (
    <div
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      className={cn(
        "flex h-10 w-full cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 shadow-none transition-colors",
        disabled ? "cursor-not-allowed bg-slate-100 opacity-60" : "",
        isOpen && "ring-1 ring-blue-100",
      )}
    >
      <Search className="mr-2 h-4 w-4 flex-shrink-0 text-slate-400" />
      {isOpen ? (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 bg-transparent text-sm outline-none"
          autoComplete="off"
        />
      ) : (
        <span
          className={cn(
            "flex-1 truncate text-sm",
            selectedItem ? "text-slate-900" : "text-slate-400",
          )}
        >
          {selectedItem ? getItemLabel(selectedItem) : placeholder}
        </span>
      )}
      {allowClear && selectedItem && !isOpen ? (
        <button
          type="button"
          onClick={handleClear}
          className="rounded p-1 hover:bg-slate-100"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ) : (
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      )}
    </div>
  );

  const dropdown = (
    <div ref={containerRef} className={cn("relative", className)}>
      {portal ? <PopoverAnchor asChild>{trigger}</PopoverAnchor> : trigger}
      {dropdownList}
    </div>
  );

  if (!portal) return dropdown;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setQuery("");
          setHighlightedIndex(-1);
        }
      }}
    >
      {dropdown}
    </Popover>
  );
}

export { SearchableDropdown };
