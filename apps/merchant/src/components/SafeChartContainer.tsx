import React, { useEffect, useRef, useState } from "react";

type SafeChartContainerProps = {
  children: React.ReactElement<{ width?: number; height?: number }>;
  className?: string;
};

/**
 * يقيس الحاوية ويمرّر width/height بالبكسل للمخطط مباشرة
 * بدون ResponsiveContainer — لتجنب تحذير Recharts width(-1)/height(-1).
 */
export function SafeChartContainer({
  children,
  className = "h-72 w-full min-w-0",
}: SafeChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const width = Math.max(0, Math.floor(rect.width));
        const height = Math.max(0, Math.floor(rect.height));
        setSize((prev) => {
          if (prev && prev.width === width && prev.height === height) return prev;
          return width > 0 && height > 0 ? { width, height } : null;
        });
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const t1 = window.setTimeout(measure, 100);
    const t2 = window.setTimeout(measure, 400);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div ref={ref} className={`min-w-0 ${className}`}>
      {size
        ? React.cloneElement(children, {
            width: size.width,
            height: size.height,
          })
        : null}
    </div>
  );
}
