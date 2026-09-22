import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { BigButton } from "./BigButton";
import { Sheet } from "./Sheet";

interface ConsentSheetProps {
  open: boolean;
  checked: boolean;
  onCheck: (v: boolean) => void;
  onClose: () => void;
  onSave: () => void;
}

export function ConsentSheet({ open, checked, onCheck, onClose, onSave }: ConsentSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onClose={onClose} ariaLabel={t("patientNew.consentTitle")} describedBy="consent-body">
      <div className="flex items-center justify-between">
        <h2 className="text-section font-extrabold">{t("patientNew.consentTitle")}</h2>
        <button
          data-autofocus
          type="button"
          className="btn-ghost min-h-[48px] px-3"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <p id="consent-body" className="mt-3 text-body text-ink">{t("patientNew.consentBody")}</p>

      <label className="mt-5 flex min-h-[56px] cursor-pointer items-start gap-3 rounded-card bg-mist p-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="mt-1 size-6 accent-neem"
        />
        <span className="text-body font-semibold text-ink">{t("patientNew.consentCheckbox")}</span>
      </label>

      <BigButton className="mt-5 w-full" disabled={!checked} onClick={onSave}>
        {t("patientNew.save")}
      </BigButton>
    </Sheet>
  );
}