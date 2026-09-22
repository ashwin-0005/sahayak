import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function PageShell({ children, noNav = false }: { children?: ReactNode; noNav?: boolean }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] px-4 pb-28 pt-4">
      <main>{children ?? null}</main>
      {!noNav ? <BottomNav /> : null}
    </div>
  );
}