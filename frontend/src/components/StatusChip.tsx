import { useTranslation } from "react-i18next";
import { Check, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import type { SyncStatus } from "../types";

// One sync state as an icon + word pill — never colour alone.
export function StatusChip({ status }: { status: SyncStatus }) {
  const { t } = useTranslation();

  if (status === "offline")
    return (
      <span className="chip bg-mist text-ink">
        <CloudOff className="size-4" aria-hidden="true" />
        {t("status.offline")}
      </span>
    );
  if (status === "syncing")
    return (
      <span className="chip bg-neem text-white">
        <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
        {t("status.syncing")}
      </span>
    );
  if (status === "error")
    return (
      <span className="chip bg-danger text-white">
        <TriangleAlert className="size-4" aria-hidden="true" />
        {t("status.error")}
      </span>
    );
  return (
    <span className="chip bg-mist text-neem-dark">
      <Check className="size-4" aria-hidden="true" />
      {t("status.online")}
    </span>
  );
}