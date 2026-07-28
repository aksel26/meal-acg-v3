"use client";

import { useId, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

export const operationInputClass =
  "operation-input h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950/10";
export const operationTextareaClass = `${operationInputClass} h-24 py-2`;
export const operationButtonClass =
  "operation-button inline-flex h-9 touch-manipulation items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const operationSecondaryButtonClass =
  "operation-button inline-flex h-9 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const operationDangerButtonClass =
  "operation-button inline-flex h-9 touch-manipulation items-center justify-center rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export type OperationPaginationMeta = {
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function OperationsPage({
  title,
  variant = "user",
  children,
}: {
  title: string;
  description: string;
  variant?: "user" | "admin";
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={title}
      data-operations-variant={variant}
      className={
        variant === "admin" ? "w-full space-y-4" : "mx-auto max-w-7xl space-y-5"
      }
    >
      {children}
    </div>
  );
}

export function OperationsSection({
  title,
  description,
  collapsible = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  if (collapsible) {
    return (
      <CollapsibleOperationsSection
        title={title}
        description={description}
        defaultOpen={defaultOpen}
      >
        {children}
      </CollapsibleOperationsSection>
    );
  }

  return (
    <section
      data-operations-section
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="mb-4">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function CollapsibleOperationsSection({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      data-operations-section
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 [&::-webkit-details-marker]:hidden">
        {title}
        {description && (
          <span className="mt-1 block text-sm font-normal text-slate-500">
            {description}
          </span>
        )}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function OperationStatus({
  value,
  labels,
}: {
  value: string;
  labels: Record<string, string>;
}) {
  const tone =
    value === "approved" || value === "published" || value === "active"
      ? "bg-emerald-50 text-emerald-700"
      : value === "pending"
        ? "bg-amber-50 text-amber-700"
        : value === "rejected"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {labels[value] ?? value}
    </span>
  );
}

export function OperationEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

export function OperationLoading({
  label = "불러오는 중",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="space-y-2 rounded-xl bg-slate-50 p-4"
    >
      <span className="sr-only">{label}</span>
      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export function OperationPagination({
  page,
  hasMore,
  disabled = false,
  onPageChange,
}: {
  page: number;
  hasMore: boolean;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (page === 1 && !hasMore) return null;

  return (
    <nav
      aria-label="목록 페이지"
      className="flex items-center justify-center gap-3 py-1"
    >
      <button
        type="button"
        disabled={disabled || page === 1}
        className={operationSecondaryButtonClass}
        onClick={() => onPageChange(page - 1)}
      >
        이전
      </button>
      <span className="min-w-16 text-center text-sm font-medium text-slate-600">
        {page}페이지
      </span>
      <button
        type="button"
        disabled={disabled || !hasMore}
        className={operationSecondaryButtonClass}
        onClick={() => onPageChange(page + 1)}
      >
        다음
      </button>
    </nav>
  );
}

export function OperationConfirmDialog({
  children,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>돌아가기</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function OperationReasonDialog({
  children,
  title,
  description,
  label,
  confirmLabel,
  required = true,
  onConfirm,
}: {
  children: ReactNode;
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  required?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setReason("");
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            try {
              await onConfirm(reason.trim());
              setOpen(false);
              setReason("");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <label
            htmlFor={inputId}
            className="mt-4 block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
          <textarea
            id={inputId}
            name="reason"
            required={required}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={`mt-2 ${operationTextareaClass}`}
          />
          <DialogFooter className="mt-5">
            <DialogClose asChild>
              <button type="button" className={operationSecondaryButtonClass}>
                돌아가기
              </button>
            </DialogClose>
            <button
              disabled={submitting}
              className={operationDangerButtonClass}
            >
              {confirmLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
