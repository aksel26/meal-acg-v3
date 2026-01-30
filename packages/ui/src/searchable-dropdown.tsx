"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { Search, X, Check, ChevronDown } from "lucide-react";

// 한글 초성 배열
const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// 문자열에서 초성 추출
function getChosung(str: string): string {
  return str
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // 한글 음절 범위 (가 ~ 힣)
      if (code >= 0xAC00 && code <= 0xD7A3) {
        const chosungIndex = Math.floor((code - 0xAC00) / 588);
        return CHOSUNG[chosungIndex];
      }
      return char;
    })
    .join('');
}

// 초성 검색 매칭 확인
function matchesChosung(text: string, query: string): boolean {
  if (!query) return true;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // 일반 텍스트 매칭
  if (lowerText.includes(lowerQuery)) return true;

  // 초성 매칭: 검색어가 초성으로만 구성된 경우
  const isChosungOnly = query.split('').every((char) => CHOSUNG.includes(char));
  if (isChosungOnly) {
    const textChosung = getChosung(text);
    return textChosung.includes(query);
  }

  // 초성 + 일반 문자 혼합 매칭
  const textChosung = getChosung(text);
  return textChosung.toLowerCase().includes(lowerQuery);
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
  className,
}: SearchableDropdownProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

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
        !containerRef.current.contains(event.target as Node)
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
    if (disabled) return;
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
          Math.min(prev + 1, filteredItems.length - 1)
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
        isHighlighted ? "bg-blue-50" : "hover:bg-slate-50"
      )}
    >
      <span className="text-sm">{getItemLabel(item)}</span>
      {value === getItemKey(item) && (
        <Check className="w-4 h-4 text-blue-500" />
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <div
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex items-center w-64 h-10 px-3 border rounded-lg bg-white cursor-pointer transition-colors",
          disabled
            ? "bg-slate-100 cursor-not-allowed opacity-60"
            : "hover:border-blue-400",
          isOpen && "border-blue-400 ring-1 ring-blue-100"
        )}
      >
        <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="flex-1 outline-none text-sm bg-transparent"
            autoComplete="off"
          />
        ) : (
          <span
            className={cn(
              "flex-1 text-sm truncate",
              selectedItem ? "text-slate-900" : "text-slate-400"
            )}
          >
            {selectedItem ? getItemLabel(selectedItem) : placeholder}
          </span>
        )}
        {allowClear && selectedItem && !isOpen ? (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-slate-100 rounded"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-400 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        )}
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {filteredItems.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500 text-center">
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
        </div>
      )}
    </div>
  );
}

export { SearchableDropdown };
