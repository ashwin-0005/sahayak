import { useTranslation } from "react-i18next";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-mist rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function PatientCardSkeleton() {
  return (
    <div className="card p-4 animate-pulse space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-mist" />
          <Skeleton className="w-20 h-5" />
        </div>
      </div>
    </div>
  );
}

export function PatientListSkeleton({ count = 3 }: { count?: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={t("common.loading")}>
      <span className="sr-only">{t("common.loading")}</span>
      {Array.from({ length: count }, (_, i) => (
        <PatientCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DueListSkeleton({ count = 3 }: { count?: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={t("common.loading")}>
      <span className="sr-only">{t("common.loading")}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-4 animate-pulse space-y-3 rail-clinic">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="w-28 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-neem" />
              <Skeleton className="w-16 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SummaryCardSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="card flex flex-col items-center gap-1 text-center animate-pulse" role="status" aria-label={t("common.loading")}>
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="size-6" />
      <Skeleton className="text-4xl w-12" />
      <Skeleton className="text-base w-20" />
    </div>
  );
}