import { useEffect, useRef, useState } from "react";

export interface VantageDelays {
  brand: string;
  navItem: (index: number) => string;
  timePanel: string;
  headerAction: string;
  heroLine1: string;
  heroLine2: string;
  copy: string;
  cta: string;
  tryDemo: string;
  demoCard: string;
  section: (index: number, base?: number) => string;
  field: (index: number) => string;
  action: (index: number) => string;
}

const DEFAULT_DELAYS: VantageDelays = {
  brand: "60ms",
  navItem: (i) => `${130 + i * 45}ms`,
  timePanel: "180ms",
  headerAction: "220ms",
  heroLine1: "300ms",
  heroLine2: "440ms",
  copy: "740ms",
  cta: "960ms",
  tryDemo: "1000ms",
  demoCard: "1040ms",
  section: (i, base = 180) => `${base + i * 120}ms`,
  field: (i) => `${180 + i * 100}ms`,
  action: (i) => `${420 + i * 120}ms`,
};

export function useVantageMotion(): {
  delays: VantageDelays;
  onSettled: () => void;
  isSettled: boolean;
} {
  const [isSettled, setIsSettled] = useState(false);
  const settledRef = useRef(false);

  useEffect(() => {
    if (settledRef.current) {
      setIsSettled(true);
      return;
    }
    const html = document.documentElement;
    const settle = () => {
      html.classList.remove("motion-pending");
      settledRef.current = true;
      setIsSettled(true);
    };
    html.classList.add("motion-pending");
    const fallback = window.setTimeout(settle, 3500);
    return () => {
      window.clearTimeout(fallback);
      html.classList.remove("motion-pending");
    };
  }, []);

  const onSettled = () => {
    if (!settledRef.current) {
      settledRef.current = true;
      document.documentElement.classList.remove("motion-pending");
      setIsSettled(true);
    }
  };

  return { delays: DEFAULT_DELAYS, onSettled, isSettled };
}