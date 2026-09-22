import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

// Friendly cold-start notice: spinner + words, in the worker's language.
// Shown when a request outlives the waking threshold (server asleep).
export function WakeNotice({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="card flex items-center gap-3">
      <RefreshCw className="size-6 shrink-0 animate-spin text-neem" aria-hidden="true" />
      <p className="text-body font-semibold text-ink">{message ?? t("login.waking")}</p>
    </div>
  );
}
