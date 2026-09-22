import { useRef, type ReactNode } from "react";
import { useDialog } from "../lib/dialog";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  children: ReactNode;
}

// Bottom-sheet modal: overlay + Escape/Tab focus trap + focus return on
// close (see useDialog). Mark the element that should receive initial focus
// with data-autofocus.
export function Sheet({ open, onClose, ariaLabel, describedBy, role = "dialog", children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(panelRef, open, onClose);

  if (!open) return null;

  return (
    <div className="sheet-overlay" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        className="sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}