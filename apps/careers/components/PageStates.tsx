import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Skeleton } from "@repo/ui/src/skeleton";

export function PageLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div
      aria-label="불러오는 중"
      aria-busy="true"
      className="careers-panel space-y-3 p-5"
    >
      <Skeleton className="h-7 w-48" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function PageError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="careers-panel flex flex-col items-center px-5 py-14 text-center"
    >
      <AlertCircle
        className="size-8 text-[#b42318]"
        strokeWidth={1.5}
        aria-hidden
      />
      <h2 className="mt-3 font-semibold text-[#1d1d1f]">
        정보를 불러오지 못했습니다.
      </h2>
      <p className="mt-1 max-w-lg text-sm text-[#7a7a7a]">
        {message || "잠시 후 다시 시도해 주세요."}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="careers-panel flex flex-col items-center px-5 py-14 text-center">
      <Inbox className="size-8 text-[#aeaeb2]" strokeWidth={1.5} aria-hidden />
      <h2 className="mt-3 font-semibold text-[#1d1d1f]">{title}</h2>
      <p className="mt-1 max-w-lg text-sm text-[#7a7a7a]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return action ? <div className="mb-4 flex justify-end">{action}</div> : null;
}
