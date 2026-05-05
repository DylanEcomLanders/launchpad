"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  duration?: number;     // ms
  delay?: number;        // ms — wait this long after enter-view before starting
  prefix?: string;
  suffix?: string;
  className?: string;
}

/* Counter that spins up to its target the first time it scrolls into view.
 * Uses expo-out easing — fast start, soft settle. No deps. */
export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 1800,
  delay = 0,
  prefix = "",
  suffix = "",
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const begin = () => {
              const start = performance.now();
              const tick = (now: number) => {
                const t = Math.min(1, (now - start) / duration);
                // ease-out expo: rapid start, very soft settle
                const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
                setDisplay(value * eased);
                if (t < 1) requestAnimationFrame(tick);
                else setDisplay(value);
              };
              requestAnimationFrame(tick);
            };
            if (delay > 0) setTimeout(begin, delay);
            else begin();
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, delay]);

  // Add 0 to normalize -0 → 0 before formatting
  const formatted = (display + 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
