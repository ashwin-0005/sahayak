import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 2200);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-button bg-ink px-5 py-3 text-white shadow-lg"
    >
      <Check className="size-5" aria-hidden="true" />
      <span className="text-body font-semibold">{message}</span>
    </div>
  );
}