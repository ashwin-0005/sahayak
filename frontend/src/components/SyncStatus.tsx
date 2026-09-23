import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Clock, KeyRound, RefreshCw } from "lucide-react";
import { useSync } from "../sync/useSync";
import { formatTime } from "../lib/dates";
import { useSlowNotice } from "../lib/useSlow";
import { Badge } from "./Badge";
import { StatusChip } from "./StatusChip";

export function SyncStatus({ onSynced }: { onSynced?: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const sync = useSync();
  const slowSync = useSlowNotice(sync.status === "syncing");

  const pendingLabel = sync.pending === 1 ? t("status.pendingOne") : t("status.pending", { count: sync.pending });

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <StatusChip status={sync.status} />
        {sync.pending > 0 ? <Badge tone="warning">{pendingLabel}</Badge> : null}
        {sync.authExpired ? (
          <span role="alert" className="text-support font-bold text-danger">
            {t("status.authExpired")}
          </span>
        ) : sync.status === "syncing" && slowSync ? (
          <span role="status" className="text-support text-neem-dark">
            {t("status.slowSync")}
          </span>
        ) : null}
        <span className="flex items-center gap-1 text-support text-neem-dark">
          <Clock className="size-4" aria-hidden="true" />
          {sync.lastSyncedAt ? t("status.lastSync", { time: formatTime(sync.lastSyncedAt, i18n.language) }) : t("status.never")}
        </span>
      </div>
      {sync.authExpired ? (
        <button type="button" className="btn-secondary" onClick={() => navigate("/login")}>
          <KeyRound className="size-5" aria-hidden="true" />
          {t("status.relogin")}
        </button>
      ) : (
        <button type="button" className="btn-secondary" onClick={() => void sync.syncNow().then(() => onSynced?.())}>
          <RefreshCw className="size-5" aria-hidden="true" />
          {t("status.syncNow")}
        </button>
      )}
    </div>
  );
}