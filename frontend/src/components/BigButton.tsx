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
}

const VARIANTS: Record<string, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn bg-urgent text-white"
};

export function BigButton({
  children,
  icon: Icon,
  variant = "primary",
  disabled,
  onClick,
  className = "",
  type = "button"
}: BigButtonProps) {
  return (
    <button
      type={type}
      className={`${VARIANTS[variant]} ${disabled ? "opacity-45" : ""} active:scale-[0.98] transition-transform duration-75 ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon ? <Icon className="size-6" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}