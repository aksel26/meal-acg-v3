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
      <SelectTrigger className="h-9 w-[140px] rounded-lg border-[#f3f3f3] bg-white text-sm text-slate-600">
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
