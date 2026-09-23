import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface BigButtonProps {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  // Marks this button as the dialog's initial focus target (see useDialog).
  dataAutofocus?: boolean;
}

const VARIANTS: Record<string, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  // Destructive actions use the system danger token — never the clinical
  // urgent red (reserved for patient risk).
  danger: "btn bg-danger text-white"
};

export function BigButton({
  children,
  icon: Icon,
  variant = "primary",
  disabled,
  onClick,
  className = "",
  type = "button",
  dataAutofocus = false
}: BigButtonProps) {
  return (
    <button
      type={type}
      className={`${VARIANTS[variant]} ${disabled ? "opacity-45" : ""} active:scale-[0.98] transition-transform duration-75 ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...(dataAutofocus ? { "data-autofocus": true } : {})}
    >
      {Icon ? <Icon className="size-6" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}