"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";

interface DayoffsFilterProps {
  categories: string[];
  selected: string;
  onChange: (category: string) => void;
}

export default function DayoffsFilter({
  categories,
  selected,
  onChange,
}: DayoffsFilterProps) {
  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger className="w-[140px] h-9 text-sm rounded-lg border-[oklch(0.90_0.01_250)]">
        <SelectValue placeholder="유형 선택" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
