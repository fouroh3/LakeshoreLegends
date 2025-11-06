import React, { useEffect, useMemo, useRef, useState } from "react";

type Density = "compact" | "ultra";

/**
 * Computes a real per-column width so an entire row fits the container
 * without transforms. Also derives a sizeTier and injects it into each child.
 */
export default function AbilitiesGrid({
  columns,
  density,
  children,
}: {
  columns: number;
  density: Density;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);

  // tighter gaps in Ultra
  const GAP_PX = density === "ultra" ? 8 : 12;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const cols = Math.max(1, Number.isFinite(columns) ? columns : 4);

  // Column width (true layout width), clamped to keep legible
  const colWidth = useMemo(() => {
    if (!containerW) return 300; // safe default
    const totalGap = GAP_PX * Math.max(0, cols - 1);
    const per = Math.floor((containerW - totalGap) / cols);
    const min = density === "ultra" ? 210 : 240; // allow smaller in Ultra
    return Math.max(min, per);
  }, [containerW, cols, GAP_PX, density]);

  // Derive a size tier for children to adjust typography/padding/avatar etc.
  // 0 = largest (roomy), 4 = smallest (tight)
  const sizeTier: 0 | 1 | 2 | 3 | 4 = useMemo(() => {
    if (colWidth >= 340) return 0;
    if (colWidth >= 300) return 1;
    if (colWidth >= 260) return 2;
    if (colWidth >= 220) return 3;
    return 4;
  }, [colWidth]);

  return (
    <div
      ref={containerRef}
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: GAP_PX,
        ["--col-w" as any]: `${colWidth}px`,
      }}
    >
      {React.Children.map(children, (child, i) => {
        const node = React.isValidElement(child)
          ? React.cloneElement(child as any, { sizeTier })
          : child;
        return (
          <div key={i} style={{ width: "var(--col-w)", justifySelf: "center" }}>
            <div style={{ width: "100%" }}>{node}</div>
          </div>
        );
      })}
    </div>
  );
}
