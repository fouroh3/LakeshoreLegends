import type { PropsWithChildren } from "react";

export default function AbilitiesGrid({
  columns = 6,
  mode = "auto",
  children,
}: PropsWithChildren<{ columns?: number; mode?: "auto" | "fixed" }>) {
  // mode "auto" = fills available width (nice for 1–6 columns)
  // mode "fixed" = forces each column to 280px and allows horizontal scroll
  const isFixed = mode === "fixed";

  return (
    <div
      className={`grid gap-4 ${isFixed ? "w-max" : "w-full"}`}
      style={{
        gridTemplateColumns: isFixed
          ? `repeat(${columns}, 280px)`
          : `repeat(${columns}, minmax(260px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
