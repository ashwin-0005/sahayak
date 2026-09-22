import { useTranslation } from "react-i18next";
import { Baby, Droplets, HeartPulse, Stethoscope } from "lucide-react";
import type { ComponentType } from "react";
import type { Condition } from "../types";
import { Badge } from "./Badge";

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
    <Badge icon={Icon}>{t(`condition.${condition}`)}</Badge>
  );
}