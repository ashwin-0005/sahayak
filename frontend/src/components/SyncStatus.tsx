import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CloudOff, KeyRound, RefreshCw, AlertTriangle, Check, Clock } from "lucide-react";
import { useSync } from "../sync/useSync";
import { formatTime } from "../lib/dates";
import { useSlowNotice } from "../lib/useSlow";

export function SyncStatus({ onSynced }: { onSynced?: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const sync = useSync();
  const slowSync = useSlowNotice(sync.status === "syncing");

  const pendingLabel = sync.pending === 1 ? t("status.pendingOne") : t("status.pending", { count: sync.pending });

  const chip = () => {
    const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-bold";
    if (sync.status === "offline")
      return (
        <span className={`${base} bg-mist text-ink`}>
          <CloudOff className="size-4" aria-hidden="true" />
          {t("status.offline")}
        </span>
      );
    if (sync.status === "syncing")
      return (
        <span className={`${base} bg-neem text-white`}>
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          {t("status.syncing")}
        </span>
      );
    if (sync.status === "error")
      return (
        <span className={`${base} bg-urgent text-white`}>
          <AlertTriangle className="size-4" aria-hidden="true" />
          {t("status.error")}
        </span>
      );
    return (
      <span className={`${base} bg-mist text-neem-dark`}>
        <Check className="size-4" aria-hidden="true" />
        {t("status.online")}
      </span>
    );
  };

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {chip()}
        {sync.pending > 0 && (
          <span className="tag bg-clinic text-ink">{pendingLabel}</span>
        )}
        {sync.authExpired ? (
          <span role="alert" className="text-base font-bold text-urgent">
            {t("status.authExpired")}
          </span>
        ) : sync.status === "syncing" && slowSync ? (
          <span role="status" className="text-base text-neem-dark">
            {t("status.slowSync")}
          </span>
        ) : null}
        <span className="flex items-center gap-1 text-base text-neem-dark">
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