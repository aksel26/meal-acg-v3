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

export interface AutoCompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions?: string[];
  onValueChange?: (value: string) => void;
  allowFreeText?: boolean;
  maxSuggestions?: number;
  emptyText?: string;
}

const AutoCompleteInput = React.forwardRef<HTMLInputElement, AutoCompleteInputProps>(
  ({ suggestions = [], onValueChange, allowFreeText = true, maxSuggestions = 10, emptyText = "No suggestions found", className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Filter suggestions based on input value (supports Korean consonant search)
    const filteredSuggestions = React.useMemo(() => {
      const inputValue = props.value;
      if (!inputValue || typeof inputValue !== "string") {
        return suggestions.slice(0, maxSuggestions);
      }

      const filtered = suggestions.filter((suggestion) => matchesChosung(suggestion, inputValue));

      return filtered.slice(0, maxSuggestions);
    }, [suggestions, props.value, maxSuggestions]);

    // Handle input focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsOpen(true);
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
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-input bg-popover shadow-md">
            {filteredSuggestions.length > 0 ? (
              <div className="py-1">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center px-3 py-2 text-sm text-left",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground",
                      selectedIndex === index && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="block truncate">{suggestion}</span>
                    {props.value === suggestion && (
                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-xs sm:text-sm text-muted-foreground">{emptyText}</div>
            )}
          </div>
        )}
      </div>
    );
  }
);

AutoCompleteInput.displayName = "AutoCompleteInput";

export { AutoCompleteInput };
