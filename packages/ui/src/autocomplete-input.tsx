"use client";

import * as React from "react";
import { cn } from "../lib/utils";

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

export interface AutoCompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onSelect"> {
  suggestions?: string[];
  onValueChange?: (value: string) => void;
  onSuggestionSelect?: (value: string) => void;
  allowFreeText?: boolean;
  maxSuggestions?: number;
  emptyText?: string;
}

const AutoCompleteInput = React.forwardRef<HTMLInputElement, AutoCompleteInputProps>(
  ({ suggestions = [], onValueChange, onSuggestionSelect, allowFreeText = true, maxSuggestions = 10, emptyText = "No suggestions found", className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    const [dropdownPosition, setDropdownPosition] = React.useState<"bottom" | "top">("bottom");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Filter suggestions based on input value (supports Korean consonant search)
    const filteredSuggestions = React.useMemo(() => {
      const inputValue = props.value;
      if (!inputValue || typeof inputValue !== "string") {
        return suggestions.slice(0, maxSuggestions);
      }

      const filtered = suggestions.filter((suggestion) => matchesChosung(suggestion, inputValue));

      return filtered.slice(0, maxSuggestions);
    }, [suggestions, props.value, maxSuggestions]);

    // Calculate dropdown position based on available space
    const calculateDropdownPosition = React.useCallback(() => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = Math.min(filteredSuggestions.length * 40 + 8, 240); // Approximate height

      // Prefer bottom, but switch to top if not enough space below and more space above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition("top");
      } else {
        setDropdownPosition("bottom");
      }
    }, [filteredSuggestions.length]);

    // Handle input focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsOpen(true);
      calculateDropdownPosition();
      props.onFocus?.(e);
    };

    // Handle input blur
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Delay to allow clicks on suggestions
      setTimeout(() => {
        setIsOpen(false);
        setSelectedIndex(-1);
      }, 150);
      props.onBlur?.(e);
    };

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSelectedIndex(-1);
      setIsOpen(true);
      calculateDropdownPosition();

      if (allowFreeText) {
        onValueChange?.(value);
      }
      props.onChange?.(e);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isOpen && filteredSuggestions.length > 0) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
            break;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
            break;
          case "Enter":
            e.preventDefault();
            if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
              handleSuggestionClick(filteredSuggestions[selectedIndex]);
            }
            break;
          case "Escape":
            setIsOpen(false);
            setSelectedIndex(-1);
            break;
        }
      }
      props.onKeyDown?.(e);
    };

    // Handle suggestion click
    const handleSuggestionClick = (suggestion: string) => {
      onValueChange?.(suggestion);
      onSuggestionSelect?.(suggestion);
      setIsOpen(false);
      setSelectedIndex(-1);
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSelectedIndex(-1);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Recalculate position on scroll or resize
    React.useEffect(() => {
      if (!isOpen) return;

      const handleReposition = () => calculateDropdownPosition();

      window.addEventListener("resize", handleReposition);
      window.addEventListener("scroll", handleReposition, true);

      return () => {
        window.removeEventListener("resize", handleReposition);
        window.removeEventListener("scroll", handleReposition, true);
      };
    }, [isOpen, calculateDropdownPosition]);

    return (
      <div ref={containerRef} className="relative w-full">
        {/* Input */}
        <input
          ref={ref}
          {...props}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none ",
            "disabled:cursor-not-allowed disabled:opacity-50",
            suggestions.length > 0 && "pr-8", // Add padding for dropdown arrow
            className
          )}
          autoComplete="off"
        />

        {/* Dropdown Arrow */}
        {suggestions.length > 0 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}

        {/* Suggestions Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className={cn(
              "absolute left-0 right-0 z-50 max-h-60 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg",
              dropdownPosition === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
            )}
          >
            {filteredSuggestions.length > 0 ? (
              <div className="py-1.5">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center px-4 py-3 text-sm text-left transition-colors",
                      "active:bg-gray-100",
                      selectedIndex === index ? "bg-gray-50 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="block truncate">{suggestion}</span>
                    {props.value === suggestion && (
                      <span className="absolute right-3 flex h-5 w-5 items-center justify-center text-gray-900">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">{emptyText}</div>
            )}
          </div>
        )}
      </div>
    );
  }
);

AutoCompleteInput.displayName = "AutoCompleteInput";

export { AutoCompleteInput };
