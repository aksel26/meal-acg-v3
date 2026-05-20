"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon, Plus, Search } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Calendar } from "@repo/ui/src/calendar";
import { DatePicker } from "@repo/ui/src/date-picker";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Textarea } from "@repo/ui/src/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { cn } from "@repo/ui/lib/utils";

export type FinanceField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "month" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  className?: string;
};

export type FinanceColumn<T> = {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
};

type Props<T extends { id: string }> = {
  title: string;
  description: string;
  items: T[];
  isLoading: boolean;
  fields: FinanceField[];
  columns: FinanceColumn<T>[];
  defaultValues: Record<string, string>;
  searchPlaceholder?: string;
  onCreate: (payload: Record<string, string>) => void;
  onUpdate: (id: string, payload: Record<string, string>) => void;
  onDelete?: (id: string) => void;
};

export function FinanceCrudPage<T extends { id: string }>({
  title,
  description,
  items,
  isLoading,
  fields,
  columns,
  defaultValues,
  searchPlaceholder = "검색",
  onCreate,
  onUpdate,
  onDelete,
}: Props<T>) {
  const [keyword, setKeyword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState(defaultValues);

  const filteredItems = useMemo(() => {
    if (!keyword.trim()) return items;
    const lower = keyword.trim().toLowerCase();
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(lower));
  }, [items, keyword]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultValues);
    setDialogOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setForm(
      fields.reduce<Record<string, string>>((acc, field) => {
        const value = (item as Record<string, unknown>)[field.key];
        acc[field.key] = value === null || value === undefined ? "" : String(value);
        return acc;
      }, {}),
    );
    setDialogOpen(true);
  };

  const close = () => {
    setEditing(null);
    setForm(defaultValues);
    setDialogOpen(false);
  };

  const submit = () => {
    if (editing) {
      onUpdate(editing.id, form);
    } else {
      onCreate(form);
    }
    close();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            등록
          </Button>
        </div>
        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-400">데이터가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-4 py-2.5">{column.label}</th>
                  ))}
                  <th className="w-36 px-4 py-2.5 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 text-slate-700">
                        {column.render
                          ? column.render(item)
                          : String((item as Record<string, unknown>)[column.key] ?? "-")}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                          수정
                        </Button>
                        {onDelete && (
                          <Button size="sm" variant="outline" onClick={() => onDelete(item.id)}>
                            비활성
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : close())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? `${title} 수정` : `${title} 등록`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className={field.className || ""}>
                <Label>{field.label}</Label>
                <FieldInput
                  field={field}
                  value={form[field.key] || ""}
                  onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>취소</Button>
            <Button onClick={submit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FinanceField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "date") {
    return (
      <DatePicker
        modal
        className="mt-1"
        value={value}
        onChange={onChange}
        placeholder={`${field.label} 선택`}
      />
    );
  }

  if (field.type === "month") {
    return (
      <MonthPicker
        value={value}
        onChange={onChange}
        placeholder={`${field.label} 선택`}
      />
    );
  }

  if (field.type === "select") {
    return (
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
        <SelectTrigger className="mt-1 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!field.required && <SelectItem value="none">선택 안 함</SelectItem>}
          {(field.options || []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "textarea") {
    return (
      <Textarea
        className="mt-1 min-h-24"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      className="mt-1"
      type={field.type || "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "월 선택",
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parse(`${value}-01`, "yyyy-MM-dd", new Date()) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "mt-1 w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "yyyy년 M월", { locale: ko }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ko}
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(date) => {
            if (date) onChange(format(date, "yyyy-MM"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
