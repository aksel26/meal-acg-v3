"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";

interface ComboboxProps {
  options: string[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  popoverContentClassName?: string;
}

export function Combobox({
  options = [""],
  value = "",
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  loading = false,
  disabled = false,
  className,
  popoverContentClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const selectedOption = options.find((option) => option === value);

  // Filter options based on search value
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;

    return options.filter((option: string) => option.toLowerCase().includes(searchValue.toLowerCase()));
  }, [options, searchValue]);

  // Clear search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={cn("w-full justify-between", className)}>
          <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>{selectedOption ? selectedOption : placeholder}</span>
          {loading ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-1 w-full max-h-[300px] overflow-hidden", popoverContentClassName)}>
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} className="h-10" value={searchValue} onValueChange={setSearchValue} />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm">Loading...</span>
                </div>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option, index) => (
                <CommandItem
                  key={index}
                  value={option}
                  onSelect={(currentValue) => {
                    const newValue = currentValue === value ? "" : currentValue;
                    onValueChange?.(newValue);
                    setSearchValue(""); // Clear search when item is selected
                    setOpen(false);
                  }}
                >
                  {option}
                  <Check className={cn("ml-auto h-4 w-4", value === option ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Keep the demo for backward compatibility
