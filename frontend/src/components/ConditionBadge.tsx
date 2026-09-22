import { useTranslation } from "react-i18next";
import { Baby, Droplets, HeartPulse, Stethoscope } from "lucide-react";
import type { ComponentType } from "react";
import type { Condition } from "../types";

const CONDITION_ICON: Record<Condition, ComponentType<{ className?: string }>> = {
  hypertension: HeartPulse,
  diabetes: Droplets,
  tb: Stethoscope,
  pregnancy: Baby
};

export function ConditionBadge({ condition }: { condition: Condition }) {
  const { t } = useTranslation();
  const Icon = CONDITION_ICON[condition];
  return (
    <span className="tag bg-mist text-neem-dark">
      <Icon className="size-4" aria-hidden="true" />
      {t(`condition.${condition}`)}
    </span>
  );
}